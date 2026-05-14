import express from "express";
import { v4 as uuidv4 } from "uuid";
import { readJsonFileOrDefault, writeJsonFile } from "../utils/fileUtils.js";
import { isMongoConnected } from "../db/mongo.js";
import YouTubeLinkModel from "../models/YouTubeLink.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const YOUTUBE_FILE = "YouTubeLinks.json";

const isYouTubeUrl = (url) => {
	const value = String(url || "").trim();
	return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(value);
};

/** Extract video ID from youtube.com/watch?v=ID or youtu.be/ID */
function extractVideoId(url) {
	const u = String(url || "").trim();
	const youtuBe = u.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
	if (youtuBe) return youtuBe[1];
	const watch = u.match(/(?:[?&])v=([a-zA-Z0-9_-]{11})/);
	return watch ? watch[1] : null;
}

/** Parse ISO 8601 duration (e.g. PT4M13S) to human string (e.g. "4:13") */
function parseIsoDuration(iso) {
	if (!iso || typeof iso !== "string") return null;
	const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
	if (!match) return null;
	const hours = parseInt(match[1] || "0", 10);
	const minutes = parseInt(match[2] || "0", 10);
	const seconds = parseInt(match[3] || "0", 10);
	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	}
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Fetch video metadata from YouTube Data API v3 (title, channel, duration, thumbnail) */
async function fetchYoutubeMetadata(videoId, apiKey) {
	if (!apiKey) return null;
	const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
	const res = await fetch(url);
	if (!res.ok) return null;
	const data = await res.json();
	const item = data?.items?.[0];
	if (!item) return null;
	const snippet = item.snippet || {};
	const contentDetails = item.contentDetails || {};
	const thumb = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null;
	return {
		title: snippet.title || "",
		channelTitle: snippet.channelTitle || "",
		duration: parseIsoDuration(contentDetails.duration) || null,
		thumbnailUrl: thumb,
		description: snippet.description || null,
	};
}

/** Fallback: fetch title and channel from oEmbed (no API key, no duration) */
async function fetchYoutubeOEmbed(videoUrl) {
	const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const data = await res.json();
		return {
			title: data.title || "",
			channelTitle: data.author_name || "",
			duration: null,
			thumbnailUrl: data.thumbnail_url || null,
			description: null,
		};
	} catch {
		return null;
	}
}

const readLinks = async () => {
	if (isMongoConnected()) {
		const docs = await YouTubeLinkModel.find().sort({ createdAt: -1 }).lean();
		return docs.map((d) => ({
			id: d.id,
			url: d.url,
			videoId: d.videoId,
			title: d.title,
			channelTitle: d.channelTitle,
			duration: d.duration,
			thumbnailUrl: d.thumbnailUrl,
			description: d.description,
			createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
		}));
	}
	const data = await readJsonFileOrDefault(YOUTUBE_FILE, []);
	return Array.isArray(data) ? data : [];
};

const getDefaultThumbnailUrl = (videoId) =>
	videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : null;

const hydrateStoredLink = async (link) => {
	const normalizedUrl = String(link?.url || "").trim();
	const videoId = link?.videoId || extractVideoId(normalizedUrl) || "";
	let title = link?.title != null ? String(link.title) : "";
	let channelTitle = link?.channelTitle != null ? String(link.channelTitle) : "";
	let duration = link?.duration != null ? String(link.duration) : null;
	let thumbnailUrl = link?.thumbnailUrl != null ? String(link.thumbnailUrl) : null;
	let description = link?.description != null ? String(link.description) : null;

	const needsMetadata = (!title || !thumbnailUrl || !videoId) && normalizedUrl;
	if (needsMetadata) {
		const apiKey = process.env.YOUTUBE_API_KEY;
		let metadata = videoId ? await fetchYoutubeMetadata(videoId, apiKey) : null;
		if (!metadata) {
			metadata = await fetchYoutubeOEmbed(normalizedUrl);
		}
		if (metadata) {
			if (!title && metadata.title) title = String(metadata.title);
			if (!channelTitle && metadata.channelTitle) channelTitle = String(metadata.channelTitle);
			if (!duration && metadata.duration) duration = String(metadata.duration);
			if (!thumbnailUrl && metadata.thumbnailUrl) thumbnailUrl = String(metadata.thumbnailUrl);
			if (!description && metadata.description) description = String(metadata.description);
		}
	}

	if (!thumbnailUrl) {
		thumbnailUrl = getDefaultThumbnailUrl(videoId);
	}

	return {
		...link,
		url: normalizedUrl,
		videoId,
		title: title || "Unknown",
		channelTitle,
		duration,
		thumbnailUrl,
		description,
	};
};

const buildYouTubeLink = async (videoUrl) => {
	const videoId = extractVideoId(videoUrl);
	if (!videoId) {
		throw new Error("Could not extract video ID from URL");
	}

	const apiKey = process.env.YOUTUBE_API_KEY;
	let metadata = await fetchYoutubeMetadata(videoId, apiKey);
	if (!metadata) {
		metadata = await fetchYoutubeOEmbed(videoUrl);
	}
	if (!metadata) {
		metadata = {
			title: "",
			channelTitle: "",
			duration: null,
			thumbnailUrl: null,
			description: null,
		};
	}

	return {
		id: `yt-${uuidv4()}`,
		url: videoUrl,
		videoId,
		title: metadata.title != null && metadata.title !== "" ? String(metadata.title) : "Unknown",
		channelTitle: metadata.channelTitle != null ? String(metadata.channelTitle) : "",
		duration: metadata.duration != null ? String(metadata.duration) : null,
		thumbnailUrl: metadata.thumbnailUrl != null ? String(metadata.thumbnailUrl) : null,
		description: metadata.description != null ? String(metadata.description) : null,
		createdAt: new Date().toISOString(),
	};
};

router.get("/youtube-links", async (req, res) => {
	try {
		const links = await readLinks();
		const hydratedLinks = await Promise.all(links.map((link) => hydrateStoredLink(link)));

		if (isMongoConnected()) {
			await Promise.all(
				hydratedLinks.map((link) =>
					YouTubeLinkModel.updateOne(
						{ id: link.id },
						{
							$set: {
								url: link.url,
								videoId: link.videoId,
								title: link.title,
								channelTitle: link.channelTitle,
								duration: link.duration,
								thumbnailUrl: link.thumbnailUrl,
								description: link.description,
							},
						}
					)
				)
			);
		} else if (JSON.stringify(hydratedLinks) !== JSON.stringify(links)) {
			await writeJsonFile(YOUTUBE_FILE, hydratedLinks);
		}

		res.json(hydratedLinks);
	} catch (error) {
		console.error("Error fetching YouTube links:", error);
		res.status(500).json({ error: "Failed to fetch YouTube links" });
	}
});

router.post("/youtube-links", requireAuth, async (req, res) => {
	try {
		const { url, urls } = req.body || {};
		const requestedUrls = Array.isArray(urls)
			? urls.map((item) => String(item || "").trim()).filter(Boolean)
			: url
				? [String(url).trim()]
				: [];

		if (requestedUrls.length === 0) {
			return res.status(400).json({ error: "Please provide at least one YouTube URL" });
		}

		const invalidUrl = requestedUrls.find((videoUrl) => !isYouTubeUrl(videoUrl));
		if (invalidUrl) {
			return res.status(400).json({ error: `Invalid YouTube URL: ${invalidUrl}` });
		}

		const newLinks = [];
		for (const videoUrl of requestedUrls) {
			newLinks.push(await buildYouTubeLink(videoUrl));
		}

		if (isMongoConnected()) {
			await YouTubeLinkModel.insertMany(newLinks, { ordered: true });
			console.log("YouTube links saved to MongoDB:", newLinks.map((link) => link.id).join(", "));
		} else {
			const links = await readLinks();
			links.unshift(...newLinks);
			await writeJsonFile(YOUTUBE_FILE, links);
			console.log("YouTube links saved to JSON:", newLinks.map((link) => link.id).join(", "));
		}

		if (newLinks.length === 1) {
			return res.status(201).json(newLinks[0]);
		}

		return res.status(201).json({
			success: true,
			count: newLinks.length,
			data: newLinks,
		});
	} catch (error) {
		console.error("Error adding YouTube link:", error);
		if (error.message === "Could not extract video ID from URL") {
			return res.status(400).json({ error: error.message });
		}
		res.status(500).json({ error: "Failed to add YouTube link" });
	}
});

router.delete("/youtube-links/:id", requireAuth, async (req, res) => {
	try {
		if (isMongoConnected()) {
			const result = await YouTubeLinkModel.deleteOne({ id: req.params.id });
			if (result.deletedCount === 0) {
				return res.status(404).json({ error: "YouTube link not found" });
			}
			return res.status(204).send();
		}

		const links = await readLinks();
		const filtered = links.filter((link) => link.id !== req.params.id);
		if (filtered.length === links.length) {
			return res.status(404).json({ error: "YouTube link not found" });
		}
		await writeJsonFile(YOUTUBE_FILE, filtered);
		res.status(204).send();
	} catch (error) {
		console.error("Error deleting YouTube link:", error);
		res.status(500).json({ error: "Failed to delete YouTube link" });
	}
});

export default router;
