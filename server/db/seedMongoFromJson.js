import Category from "../models/Category.js";
import HagerignaHymn from "../models/HagerignaHymn.js";
import SDAHymn from "../models/SDAHymn.js";
import YouTubeLink from "../models/YouTubeLink.js";
import { readJsonFile, readJsonFileOrDefault } from "../utils/fileUtils.js";

const DEFAULT_CATEGORIES = [
	"Worship",
	"Praise",
	"Adoration",
	"Thanksgiving",
	"Prayer",
	"Repentance",
	"Salvation",
	"Faith",
	"Hope",
	"Love",
	"Peace",
	"Joy",
	"Testimony",
	"Dedication",
	"Communion",
	"Baptism",
	"Wedding",
	"Funeral",
	"Christmas",
	"Easter",
	"Other",
];

const toSlug = (name) =>
	String(name || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const extractVideoId = (url) => {
	const u = String(url || "").trim();
	const youtuBe = u.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
	if (youtuBe) return youtuBe[1];
	const watch = u.match(/(?:[?&])v=([a-zA-Z0-9_-]{11})/);
	return watch ? watch[1] : "";
};

const parseSheetMusic = (raw) => {
	if (Array.isArray(raw)) return raw.filter(Boolean);
	try {
		const parsed = JSON.parse(raw || "[]");
		return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
	} catch {
		return [];
	}
};

const mapHagerignaJson = async () => {
	const data = await readJsonFile("HagerignaData.json");
	const artistArray =
		data.resources?.array?.find((arr) => arr._name === "song_author_text")?.item ||
		[];
	const songArray =
		data.resources?.array?.find((arr) => arr._name === "song_text")?.item || [];
	const titleArray =
		data.resources?.array?.find((arr) => arr._name === "song_title_text")?.item ||
		[];
	const categoryArray =
		data.resources?.array?.find((arr) => arr._name === "category")?.item || [];
	const keyArray =
		data.resources?.array?.find((arr) => arr._name === "key")?.item || [];
	const sheetMusicArray =
		data.resources?.array?.find((arr) => arr._name === "sheet_music")?.item || [];
	const audioArray =
		data.resources?.array?.find((arr) => arr._name === "audio")?.item || [];

	const max = Math.max(artistArray.length, songArray.length, titleArray.length);
	const items = [];
	for (let i = 0; i < max; i++) {
		items.push({
			id: `hagerigna-${i}`,
			artist: artistArray[i] || "",
			song: songArray[i] || "",
			title: titleArray[i] || "",
			category: categoryArray[i] || "",
			key: keyArray[i] || "",
			sheet_music: parseSheetMusic(sheetMusicArray[i]),
			audio: audioArray[i] || "",
		});
	}
	return items;
};

const mapSdaJson = async () => {
	const data = await readJsonFile("SDA_Hymnal.json");
	const newTitleArray =
		data.resources?.array?.find((arr) => arr._name === "new_title_forbookmark")
			?.item || [];
	const oldTitleArray =
		data.resources?.array?.find((arr) => arr._name === "old_title_forbookmark")
			?.item || [];
	const newLyricsArray =
		data.resources?.array?.find((arr) => arr._name === "new_song")?.item || [];
	const englishTitleArray =
		data.resources?.array?.find((arr) => arr._name === "new_title_en")?.item || [];
	const oldLyricsArray =
		data.resources?.array?.find((arr) => arr._name === "old_song")?.item || [];
	const categoryArray =
		data.resources?.array?.find((arr) => arr._name === "category")?.item || [];
	const keyArray =
		data.resources?.array?.find((arr) => arr._name === "key")?.item || [];
	const sheetMusicArray =
		data.resources?.array?.find((arr) => arr._name === "sheet_music")?.item || [];
	const audioArray =
		data.resources?.array?.find((arr) => arr._name === "audio")?.item || [];

	const max = Math.max(
		newTitleArray.length,
		oldTitleArray.length,
		newLyricsArray.length,
		englishTitleArray.length,
		oldLyricsArray.length
	);
	const items = [];
	for (let i = 0; i < max; i++) {
		items.push({
			id: `sda-${i}`,
			newHymnalTitle: newTitleArray[i] || "",
			oldHymnalTitle: oldTitleArray[i] || "",
			newHymnalLyrics: newLyricsArray[i] || "",
			englishTitleOld: englishTitleArray[i] || "",
			oldHymnalLyrics: oldLyricsArray[i] || "",
			category: categoryArray[i] || "",
			key: keyArray[i] || "",
			sheet_music: parseSheetMusic(sheetMusicArray[i]),
			audio: audioArray[i] || "",
		});
	}
	return items;
};

const mapYouTubeJson = async () => {
	const items = await readJsonFileOrDefault("YouTubeLinks.json", []);
	return (Array.isArray(items) ? items : []).map((item, index) => ({
		id: item.id || `yt-seeded-${index}`,
		url: item.url || "",
		videoId: item.videoId || extractVideoId(item.url),
		title: item.title || "Unknown",
		channelTitle: item.channelTitle || "",
		duration: item.duration || null,
		thumbnailUrl: item.thumbnailUrl || null,
		description: item.description || null,
		createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
	}));
};

export const seedMongoFromJsonIfNeeded = async () => {
	const hagerignaCount = await HagerignaHymn.countDocuments();
	const sdaCount = await SDAHymn.countDocuments();
	const youtubeCount = await YouTubeLink.countDocuments();
	const categoryCount = await Category.countDocuments();

	if (hagerignaCount === 0) {
		const hagerigna = await mapHagerignaJson();
		if (hagerigna.length) await HagerignaHymn.insertMany(hagerigna, { ordered: false });
	}

	if (sdaCount === 0) {
		const sda = await mapSdaJson();
		if (sda.length) await SDAHymn.insertMany(sda, { ordered: false });
	}

	if (youtubeCount === 0) {
		const yt = await mapYouTubeJson();
		if (yt.length) await YouTubeLink.insertMany(yt, { ordered: false });
	}

	if (categoryCount === 0) {
		const hagerignaCats = await HagerignaHymn.distinct("category");
		const sdaCats = await SDAHymn.distinct("category");
		const all = new Set([
			...DEFAULT_CATEGORIES,
			...hagerignaCats.filter(Boolean),
			...sdaCats.filter(Boolean),
		]);
		const docs = Array.from(all).map((name) => ({
			id: `category-${toSlug(name)}`,
			name,
			slug: toSlug(name),
		}));
		if (docs.length) await Category.insertMany(docs, { ordered: false });
	}
};
