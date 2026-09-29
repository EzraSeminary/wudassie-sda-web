import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "database");

// Ensure data directory exists
const ensureDataDir = async () => {
	try {
		await fs.access(DATA_DIR);
	} catch {
		await fs.mkdir(DATA_DIR, { recursive: true });
	}
};

export const readJsonFile = async (filename) => {
	await ensureDataDir();
	const filePath = path.join(DATA_DIR, filename);
	try {
		const data = await fs.readFile(filePath, "utf8");
		return JSON.parse(data);
	} catch (error) {
		if (error.code === "ENOENT") {
			throw new Error(`File ${filename} not found`);
		}
		throw error;
	}
};

export const writeJsonFile = async (filename, data) => {
	await ensureDataDir();
	const filePath = path.join(DATA_DIR, filename);
	await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

/** Read JSON file or return default if file does not exist (e.g. for new lists). */
export const readJsonFileOrDefault = async (filename, defaultValue = []) => {
	await ensureDataDir();
	const filePath = path.join(DATA_DIR, filename);
	try {
		const data = await fs.readFile(filePath, "utf8");
		return JSON.parse(data);
	} catch (error) {
		if (error.code === "ENOENT") {
			return defaultValue;
		}
		throw error;
	}
};

// Helper function to find array by name in the data structure
const findArrayByName = (data, name) => {
	return data.resources?.array?.find((arr) => arr._name === name);
};

// Helper function to get or create array by name
const getOrCreateArray = (data, name) => {
	let array = findArrayByName(data, name);
	if (!array) {
		array = { item: [], _name: name };
		if (!data.resources) data.resources = {};
		if (!data.resources.array) data.resources.array = [];
		data.resources.array.push(array);
	}
	return array;
};

// Helper function to get max length of all arrays
const getMaxArrayLength = (arrays) => {
	if (arrays.length === 0) return 0;
	return Math.max(...arrays.map((arr) => arr.item.length || 0));
};

export const appendToHagerignaFile = async (newHymn) => {
	const data = await readJsonFile("HagerignaData.json");

	const artistArray = findArrayByName(data, "song_author_text");
	const songArray = findArrayByName(data, "song_text");
	const titleArray = findArrayByName(data, "song_title_text");

	if (!artistArray || !songArray || !titleArray) {
		throw new Error("Invalid data structure");
	}

	// Get or create arrays for new fields
	const categoryArray = getOrCreateArray(data, "category");
	const keyArray = getOrCreateArray(data, "key");
	const sheetMusicArray = getOrCreateArray(data, "sheet_music");
	const audioArray = getOrCreateArray(data, "audio");
	const isAlbumArray = getOrCreateArray(data, "is_album");
	const albumNameArray = getOrCreateArray(data, "album_name");
	const choirNameArray = getOrCreateArray(data, "choir_name");
	const trackCountArray = getOrCreateArray(data, "track_count");
	const tracksArray = getOrCreateArray(data, "tracks");

	artistArray.item.push(newHymn.artist || "");
	songArray.item.push(newHymn.song || "");
	titleArray.item.push(newHymn.title || "");
	categoryArray.item.push(newHymn.category || "");
	keyArray.item.push(newHymn.key || "");
	sheetMusicArray.item.push(JSON.stringify(newHymn.sheet_music || []));
	audioArray.item.push(newHymn.audio || "");
	isAlbumArray.item.push(newHymn.isAlbum ? "true" : "false");
	albumNameArray.item.push(newHymn.albumName || "");
	choirNameArray.item.push(newHymn.choirName || "");
	trackCountArray.item.push(String(newHymn.trackCount || newHymn.tracks?.length || 0));
	tracksArray.item.push(JSON.stringify(newHymn.tracks || []));

	await writeJsonFile("HagerignaData.json", data);
	return {
		id: `hagerigna-${artistArray.item.length - 1}`,
		...newHymn,
	};
};

export const appendToSDAFile = async (newHymn) => {
	const data = await readJsonFile("SDA_Hymnal.json");

	const newTitleArray = findArrayByName(data, "new_title_forbookmark");
	const oldTitleArray = findArrayByName(data, "old_title_forbookmark");
	const newLyricsArray = findArrayByName(data, "new_song");
	const englishTitleArray = findArrayByName(data, "new_title_en");
	const oldLyricsArray = findArrayByName(data, "old_song");

	if (
		!newTitleArray ||
		!oldTitleArray ||
		!newLyricsArray ||
		!englishTitleArray ||
		!oldLyricsArray
	) {
		throw new Error("Invalid data structure");
	}

	// Get or create arrays for new fields
	const categoryArray = getOrCreateArray(data, "category");
	const keyArray = getOrCreateArray(data, "key");
	const sheetMusicArray = getOrCreateArray(data, "sheet_music");
	const audioArray = getOrCreateArray(data, "audio");

	newTitleArray.item.push(newHymn.newHymnalTitle || "");
	oldTitleArray.item.push(newHymn.oldHymnalTitle || "");
	newLyricsArray.item.push(newHymn.newHymnalLyrics || "");
	englishTitleArray.item.push(newHymn.englishTitleOld || "");
	oldLyricsArray.item.push(newHymn.oldHymnalLyrics || "");
	categoryArray.item.push(newHymn.category || "");
	keyArray.item.push(newHymn.key || "");
	sheetMusicArray.item.push(JSON.stringify(newHymn.sheet_music || []));
	audioArray.item.push(newHymn.audio || "");

	await writeJsonFile("SDA_Hymnal.json", data);
	return {
		id: `sda-${newTitleArray.item.length - 1}`,
		...newHymn,
	};
};

export const updateHagerignaFile = async (id, updatedHymn) => {
	const data = await readJsonFile("HagerignaData.json");
	const index = parseInt(id.replace("hagerigna-", ""));

	const artistArray = findArrayByName(data, "song_author_text");
	const songArray = findArrayByName(data, "song_text");
	const titleArray = findArrayByName(data, "song_title_text");

	if (!artistArray || !songArray || !titleArray) {
		throw new Error("Invalid data structure");
	}

	const maxLength = getMaxArrayLength([artistArray, songArray, titleArray]);
	if (index < 0 || index >= maxLength) {
		throw new Error("Hymn not found");
	}

	// Get or create arrays for new fields
	const categoryArray = getOrCreateArray(data, "category");
	const keyArray = getOrCreateArray(data, "key");
	const sheetMusicArray = getOrCreateArray(data, "sheet_music");
	const audioArray = getOrCreateArray(data, "audio");
	const isAlbumArray = getOrCreateArray(data, "is_album");
	const albumNameArray = getOrCreateArray(data, "album_name");
	const choirNameArray = getOrCreateArray(data, "choir_name");
	const trackCountArray = getOrCreateArray(data, "track_count");
	const tracksArray = getOrCreateArray(data, "tracks");

	// Ensure arrays are long enough
	while (categoryArray.item.length <= index) categoryArray.item.push("");
	while (keyArray.item.length <= index) keyArray.item.push("");
	while (sheetMusicArray.item.length <= index) sheetMusicArray.item.push("[]");
	while (audioArray.item.length <= index) audioArray.item.push("");
	while (isAlbumArray.item.length <= index) isAlbumArray.item.push("false");
	while (albumNameArray.item.length <= index) albumNameArray.item.push("");
	while (choirNameArray.item.length <= index) choirNameArray.item.push("");
	while (trackCountArray.item.length <= index) trackCountArray.item.push("0");
	while (tracksArray.item.length <= index) tracksArray.item.push("[]");

	if (updatedHymn.artist !== undefined)
		artistArray.item[index] = updatedHymn.artist;
	if (updatedHymn.song !== undefined) songArray.item[index] = updatedHymn.song;
	if (updatedHymn.title !== undefined)
		titleArray.item[index] = updatedHymn.title;
	if (updatedHymn.category !== undefined)
		categoryArray.item[index] = updatedHymn.category || "";
	if (updatedHymn.key !== undefined)
		keyArray.item[index] = updatedHymn.key || "";
	if (updatedHymn.sheet_music !== undefined)
		sheetMusicArray.item[index] = JSON.stringify(updatedHymn.sheet_music || []);
	if (updatedHymn.audio !== undefined)
		audioArray.item[index] = updatedHymn.audio || "";
	if (updatedHymn.isAlbum !== undefined)
		isAlbumArray.item[index] = updatedHymn.isAlbum ? "true" : "false";
	if (updatedHymn.albumName !== undefined)
		albumNameArray.item[index] = updatedHymn.albumName || "";
	if (updatedHymn.choirName !== undefined)
		choirNameArray.item[index] = updatedHymn.choirName || "";
	if (updatedHymn.trackCount !== undefined)
		trackCountArray.item[index] = String(updatedHymn.trackCount || 0);
	if (updatedHymn.tracks !== undefined)
		tracksArray.item[index] = JSON.stringify(updatedHymn.tracks || []);

	await writeJsonFile("HagerignaData.json", data);
	
	// Parse sheet_music for return
	let sheetMusic = [];
	try {
		sheetMusic = JSON.parse(sheetMusicArray.item[index] || "[]");
	} catch {
		sheetMusic = [];
	}
	let tracks = [];
	try {
		tracks = JSON.parse(tracksArray.item[index] || "[]");
	} catch {
		tracks = [];
	}

	return {
		id,
		artist: artistArray.item[index],
		song: songArray.item[index],
		title: titleArray.item[index],
		isAlbum: isAlbumArray.item[index] === "true",
		albumName: albumNameArray.item[index] || undefined,
		choirName: choirNameArray.item[index] || undefined,
		trackCount: Number(trackCountArray.item[index]) || undefined,
		tracks: tracks.length > 0 ? tracks : undefined,
		category: categoryArray.item[index] || undefined,
		key: keyArray.item[index] || undefined,
		sheet_music: sheetMusic.length > 0 ? sheetMusic : undefined,
		audio: audioArray.item[index] || undefined,
	};
};

export const updateSDAFile = async (id, updatedHymn) => {
	const data = await readJsonFile("SDA_Hymnal.json");
	const index = parseInt(id.replace("sda-", ""));

	const newTitleArray = findArrayByName(data, "new_title_forbookmark");
	const oldTitleArray = findArrayByName(data, "old_title_forbookmark");
	const newLyricsArray = findArrayByName(data, "new_song");
	const englishTitleArray = findArrayByName(data, "new_title_en");
	const oldLyricsArray = findArrayByName(data, "old_song");

	if (
		!newTitleArray ||
		!oldTitleArray ||
		!newLyricsArray ||
		!englishTitleArray ||
		!oldLyricsArray
	) {
		throw new Error("Invalid data structure");
	}

	const maxLength = getMaxArrayLength([
		newTitleArray,
		oldTitleArray,
		newLyricsArray,
		englishTitleArray,
		oldLyricsArray,
	]);
	if (index < 0 || index >= maxLength) {
		throw new Error("Hymn not found");
	}

	// Get or create arrays for new fields
	const categoryArray = getOrCreateArray(data, "category");
	const keyArray = getOrCreateArray(data, "key");
	const sheetMusicArray = getOrCreateArray(data, "sheet_music");
	const audioArray = getOrCreateArray(data, "audio");

	// Ensure arrays are long enough
	while (categoryArray.item.length <= index) categoryArray.item.push("");
	while (keyArray.item.length <= index) keyArray.item.push("");
	while (sheetMusicArray.item.length <= index) sheetMusicArray.item.push("[]");
	while (audioArray.item.length <= index) audioArray.item.push("");

	if (updatedHymn.newHymnalTitle !== undefined)
		newTitleArray.item[index] = updatedHymn.newHymnalTitle;
	if (updatedHymn.oldHymnalTitle !== undefined)
		oldTitleArray.item[index] = updatedHymn.oldHymnalTitle;
	if (updatedHymn.newHymnalLyrics !== undefined)
		newLyricsArray.item[index] = updatedHymn.newHymnalLyrics;
	if (updatedHymn.englishTitleOld !== undefined)
		englishTitleArray.item[index] = updatedHymn.englishTitleOld;
	if (updatedHymn.oldHymnalLyrics !== undefined)
		oldLyricsArray.item[index] = updatedHymn.oldHymnalLyrics;
	if (updatedHymn.category !== undefined)
		categoryArray.item[index] = updatedHymn.category || "";
	if (updatedHymn.key !== undefined)
		keyArray.item[index] = updatedHymn.key || "";
	if (updatedHymn.sheet_music !== undefined)
		sheetMusicArray.item[index] = JSON.stringify(updatedHymn.sheet_music || []);
	if (updatedHymn.audio !== undefined)
		audioArray.item[index] = updatedHymn.audio || "";

	await writeJsonFile("SDA_Hymnal.json", data);
	
	// Parse sheet_music for return
	let sheetMusic = [];
	try {
		sheetMusic = JSON.parse(sheetMusicArray.item[index] || "[]");
	} catch {
		sheetMusic = [];
	}

	return {
		id,
		newHymnalTitle: newTitleArray.item[index],
		oldHymnalTitle: oldTitleArray.item[index],
		newHymnalLyrics: newLyricsArray.item[index],
		englishTitleOld: englishTitleArray.item[index],
		oldHymnalLyrics: oldLyricsArray.item[index],
		category: categoryArray.item[index] || undefined,
		key: keyArray.item[index] || undefined,
		sheet_music: sheetMusic.length > 0 ? sheetMusic : undefined,
		audio: audioArray.item[index] || undefined,
	};
};

export const deleteFromHagerignaFile = async (id) => {
	const data = await readJsonFile("HagerignaData.json");
	const index = parseInt(id.replace("hagerigna-", ""));

	const artistArray = findArrayByName(data, "song_author_text");
	const songArray = findArrayByName(data, "song_text");
	const titleArray = findArrayByName(data, "song_title_text");

	if (!artistArray || !songArray || !titleArray) {
		throw new Error("Invalid data structure");
	}

	const maxLength = getMaxArrayLength([artistArray, songArray, titleArray]);
	if (index < 0 || index >= maxLength) {
		throw new Error("Hymn not found");
	}

	const categoryArray = findArrayByName(data, "category");
	const keyArray = findArrayByName(data, "key");
	const sheetMusicArray = findArrayByName(data, "sheet_music");
	const audioArray = findArrayByName(data, "audio");
	const isAlbumArray = findArrayByName(data, "is_album");
	const albumNameArray = findArrayByName(data, "album_name");
	const choirNameArray = findArrayByName(data, "choir_name");
	const trackCountArray = findArrayByName(data, "track_count");
	const tracksArray = findArrayByName(data, "tracks");

	artistArray.item.splice(index, 1);
	songArray.item.splice(index, 1);
	titleArray.item.splice(index, 1);
	if (categoryArray) categoryArray.item.splice(index, 1);
	if (keyArray) keyArray.item.splice(index, 1);
	if (sheetMusicArray) sheetMusicArray.item.splice(index, 1);
	if (audioArray) audioArray.item.splice(index, 1);
	if (isAlbumArray) isAlbumArray.item.splice(index, 1);
	if (albumNameArray) albumNameArray.item.splice(index, 1);
	if (choirNameArray) choirNameArray.item.splice(index, 1);
	if (trackCountArray) trackCountArray.item.splice(index, 1);
	if (tracksArray) tracksArray.item.splice(index, 1);

	await writeJsonFile("HagerignaData.json", data);
};

export const deleteFromSDAFile = async (id) => {
	const data = await readJsonFile("SDA_Hymnal.json");
	const index = parseInt(id.replace("sda-", ""));

	const newTitleArray = findArrayByName(data, "new_title_forbookmark");
	const oldTitleArray = findArrayByName(data, "old_title_forbookmark");
	const newLyricsArray = findArrayByName(data, "new_song");
	const englishTitleArray = findArrayByName(data, "new_title_en");
	const oldLyricsArray = findArrayByName(data, "old_song");

	if (
		!newTitleArray ||
		!oldTitleArray ||
		!newLyricsArray ||
		!englishTitleArray ||
		!oldLyricsArray
	) {
		throw new Error("Invalid data structure");
	}

	const maxLength = getMaxArrayLength([
		newTitleArray,
		oldTitleArray,
		newLyricsArray,
		englishTitleArray,
		oldLyricsArray,
	]);
	if (index < 0 || index >= maxLength) {
		throw new Error("Hymn not found");
	}

	const categoryArray = findArrayByName(data, "category");
	const keyArray = findArrayByName(data, "key");
	const sheetMusicArray = findArrayByName(data, "sheet_music");
	const audioArray = findArrayByName(data, "audio");

	newTitleArray.item.splice(index, 1);
	oldTitleArray.item.splice(index, 1);
	newLyricsArray.item.splice(index, 1);
	englishTitleArray.item.splice(index, 1);
	oldLyricsArray.item.splice(index, 1);
	if (categoryArray) categoryArray.item.splice(index, 1);
	if (keyArray) keyArray.item.splice(index, 1);
	if (sheetMusicArray) sheetMusicArray.item.splice(index, 1);
	if (audioArray) audioArray.item.splice(index, 1);

	await writeJsonFile("SDA_Hymnal.json", data);
};
