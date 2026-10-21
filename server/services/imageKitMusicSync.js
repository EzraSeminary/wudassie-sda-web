import ImageKit from "imagekit";
import MusicTrack from "../models/MusicTrack.js";
import MusicCollection from "../models/MusicCollection.js";
import { MusicSyncStatus } from "../models/MusicUserData.js";

const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "aac", "ogg", "wav", "flac", "opus", "webm"]);
const configuredRoot = () => (process.env.MUSIC_IMAGEKIT_ROOT || "/SDA Songs/").replace(/\/+$/, "") || "/";
const getImageKit = () => {
	const { IMAGEKIT_PUBLIC_KEY: publicKey, IMAGEKIT_PRIVATE_KEY: privateKey, IMAGEKIT_URL_ENDPOINT: urlEndpoint } = process.env;
	if (!publicKey || !privateKey || !urlEndpoint) throw new Error("ImageKit is not configured");
	return new ImageKit({ publicKey, privateKey, urlEndpoint });
};
const cleanName = (fileName) => fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
const normalPath = (path) => (path || "/").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
const isAudio = (file) => {
	const extension = String(file.name || "").split(".").pop().toLowerCase();
	return file.fileType === "audio" || String(file.mime || file.mimeType || "").startsWith("audio/") || AUDIO_EXTENSIONS.has(extension);
};

function collectionPathsFor(filePath, root) {
	const relative = normalPath(filePath).slice(normalPath(root).length).replace(/^\//, "");
	const parts = relative.split("/").filter(Boolean);
	parts.pop();
	const paths = [];
	for (let index = 0; index < parts.length; index += 1) paths.push(normalPath(`${root}/${parts.slice(0, index + 1).join("/")}`));
	return paths;
}

export async function syncImageKitMusic() {
	const root = normalPath(configuredRoot());
	const status = await MusicSyncStatus.findOneAndUpdate({ key: "imagekit" }, { status: "running", startedAt: new Date(), error: "" }, { upsert: true, new: true });
	try {
		const imagekit = getImageKit();
		const files = [];
		// The ImageKit list endpoint is paginated and may not recurse by path. We scan pages
		// server-side, then scope by the configured root so nested folders are represented.
		for (let skip = 0; ; skip += 1000) {
			const page = await imagekit.listFiles({ limit: 1000, skip });
			files.push(...page);
			if (page.length < 1000) break;
		}
		const sourceFiles = files.filter((file) => normalPath(file.filePath).startsWith(`${root}/`) && isAudio(file));
		const seen = new Set();
		const collections = new Map();
		for (const file of sourceFiles) {
			seen.add(file.fileId);
			const paths = collectionPathsFor(file.filePath, root);
			for (const path of paths) {
				collections.set(path, { path, name: path.split("/").filter(Boolean).at(-1), parentPath: normalPath(path.substring(0, path.lastIndexOf("/"))) === root ? null : normalPath(path.substring(0, path.lastIndexOf("/"))) });
			}
			const collectionPath = paths.at(-1) || root;
			await MusicTrack.findOneAndUpdate(
				{ imageKitFileId: file.fileId },
				{ $set: { fileName: file.name, filePath: normalPath(file.filePath), url: file.url, fileType: file.fileType, mime: file.mime || file.mimeType, size: file.size, sourceCreatedAt: file.createdAt, sourceUpdatedAt: file.updatedAt, collectionPath, collectionName: collectionPath === root ? root.split("/").filter(Boolean).at(-1) || "Music" : collectionPath.split("/").at(-1), missingFromSource: false, lastSeenAt: new Date() }, $setOnInsert: { manual: { title: cleanName(file.name), published: true } } },
				{ upsert: true, new: true }
			);
		}
		for (const collection of collections.values()) await MusicCollection.findOneAndUpdate({ path: collection.path }, { $set: { ...collection, lastSeenAt: new Date() }, $setOnInsert: { manual: { published: true } } }, { upsert: true });
		await MusicTrack.updateMany({ filePath: { $regex: `^${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/` }, imageKitFileId: { $nin: [...seen] } }, { $set: { missingFromSource: true } });
		for (const collection of collections.values()) {
			const trackCount = await MusicTrack.countDocuments({ collectionPath: collection.path, missingFromSource: false, "manual.published": { $ne: false } });
			await MusicCollection.updateOne({ path: collection.path }, { $set: { trackCount } });
		}
		return await MusicSyncStatus.findByIdAndUpdate(status._id, { status: "success", finishedAt: new Date(), trackCount: sourceFiles.length, collectionCount: collections.size, error: "" }, { new: true });
	} catch (error) {
		await MusicSyncStatus.findByIdAndUpdate(status._id, { status: "failed", finishedAt: new Date(), error: error.message });
		throw error;
	}
}

export const getMusicRoot = configuredRoot;
