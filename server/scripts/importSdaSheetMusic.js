import fs from "fs/promises";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import sharp from "sharp";
import SDAHymn from "../models/SDAHymn.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.resolve(SERVER_DIR, "database/SDA_Hymnal.json");
const DEFAULT_CACHE_FILE = "/tmp/sda-sheet-music-import-cache.json";
const IMAGE_EXTENSIONS = new Set([
	".avif",
	".gif",
	".jpeg",
	".jpg",
	".png",
	".tif",
	".tiff",
	".webp",
]);
const AUDIO_EXTENSIONS = new Set([
	".aac",
	".flac",
	".m4a",
	".mp3",
	".oga",
	".ogg",
	".opus",
	".wav",
	".weba",
]);

const usage = () => {
	console.log(`
Usage:
  node server/scripts/importSdaSheetMusic.js --folder /path/to/files [--dry-run]

Options:
  --folder <path>       Folder containing sheet music files.
  --dry-run             Parse and validate without uploading or writing.
  --json-only           Update only server/database/SDA_Hymnal.json.
  --mongo-only          Update only MongoDB.
  --clear-all           Clear sheet_music and audio for every SDA hymn first.
  --allow-skipped       Continue when files cannot be mapped to existing hymns.
  --cache-file <path>   Cache uploaded URLs so retries can resume.
  --no-cache            Do not read or write the upload cache.
  --help                Show this help.
`);
};

const parseArgs = () => {
	const args = process.argv.slice(2);
	const options = {
		dryRun: false,
		json: true,
		mongo: true,
		clearAll: false,
		allowSkipped: false,
		cacheFile: DEFAULT_CACHE_FILE,
		folder: "",
	};

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (arg === "--folder") {
			options.folder = args[i + 1] || "";
			i += 1;
		} else if (arg === "--dry-run") {
			options.dryRun = true;
		} else if (arg === "--json-only") {
			options.mongo = false;
		} else if (arg === "--mongo-only") {
			options.json = false;
		} else if (arg === "--clear-all") {
			options.clearAll = true;
		} else if (arg === "--allow-skipped") {
			options.allowSkipped = true;
		} else if (arg === "--cache-file") {
			options.cacheFile = args[i + 1] || "";
			i += 1;
		} else if (arg === "--no-cache") {
			options.cacheFile = "";
		} else if (arg === "--help" || arg === "-h") {
			usage();
			process.exit(0);
		} else {
			throw new Error(`Unknown option: ${arg}`);
		}
	}

	if (!options.folder) {
		throw new Error("Missing required --folder path.");
	}
	if (!options.json && !options.mongo) {
		throw new Error("--json-only and --mongo-only cannot be used together.");
	}

	return options;
};

const findArray = (data, name) =>
	data.resources?.array?.find((entry) => entry._name === name);

const getOrCreateArray = (data, name) => {
	let entry = findArray(data, name);
	if (!entry) {
		entry = { _name: name, item: [] };
		data.resources ||= {};
		data.resources.array ||= [];
		data.resources.array.push(entry);
	}
	return entry;
};

const readSdaData = async () => {
	const raw = await fs.readFile(DATA_FILE, "utf8");
	return JSON.parse(raw);
};

const getSdaHymnCount = (data) => {
	const requiredArrays = [
		findArray(data, "new_title_forbookmark"),
		findArray(data, "old_title_forbookmark"),
		findArray(data, "new_song"),
		findArray(data, "new_title_en"),
		findArray(data, "old_song"),
	].filter(Boolean);
	return Math.max(...requiredArrays.map((entry) => entry.item?.length || 0));
};

const normalizeName = (name) =>
	name
		.normalize("NFKC")
		.replace(/[(){}\[\]]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const getPageRank = (baseName) => {
	const normalized = normalizeName(baseName).toLowerCase();
	const suffixMatch = normalized.match(/(?:^|[^a-z])([lr])(?:[^a-z]|$)/i);
	if (suffixMatch?.[1] === "l") return 10;
	if (suffixMatch?.[1] === "r") return 20;
	const pageMatch = normalized.match(/(?:page|pg|p)\s*0*(\d+)/i);
	if (pageMatch) return 100 + Number(pageMatch[1]);
	return 50;
};

const parseFileMapping = (filePath) => {
	const ext = path.extname(filePath).toLowerCase();
	const baseName = path.basename(filePath, ext);
	const numbers = [...normalizeName(baseName).matchAll(/\d+/g)]
		.map((match) => Number(match[0]))
		.filter((value) => Number.isInteger(value) && value > 0);

	const type = IMAGE_EXTENSIONS.has(ext)
		? "sheet"
		: AUDIO_EXTENSIONS.has(ext)
			? "audio"
			: "unsupported";

	return {
		filePath,
		fileName: path.basename(filePath),
		ext,
		hymnNumbers: [...new Set(numbers)],
		pageRank: getPageRank(baseName),
		type,
	};
};

const walkFiles = async (folder) => {
	const entries = await fs.readdir(folder, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const fullPath = path.join(folder, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await walkFiles(fullPath)));
		} else if (entry.isFile()) {
			files.push(fullPath);
		}
	}
	return files;
};

const createImageKit = () => {
	const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
	const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
	const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
	if (!publicKey || !privateKey || !urlEndpoint) {
		throw new Error(
			"ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT."
		);
	}
	return new ImageKit({ publicKey, privateKey, urlEndpoint });
};

const uploadFile = async (imagekit, entry) => {
	const originalBuffer = await fs.readFile(entry.filePath);
	let uploadBuffer = originalBuffer;
	let uploadExtension = entry.ext.replace(".", "") || "jpg";

	if (entry.type === "sheet") {
		const image = sharp(originalBuffer).resize(2000, 2000, {
			fit: "inside",
			withoutEnlargement: true,
		});
		if (entry.ext === ".png") {
			uploadBuffer = await image.png({ quality: 85, compressionLevel: 9 }).toBuffer();
			uploadExtension = "png";
		} else {
			uploadBuffer = await image.jpeg({ quality: 85 }).toBuffer();
			uploadExtension = "jpg";
		}
	}

	const folder = entry.type === "audio" ? "/hymns/audio/" : "/hymns/sheet-music/";
	const baseName = path.basename(entry.fileName, entry.ext).replace(/[^a-zA-Z0-9_-]+/g, "_");
	const fileName = `sda-${entry.hymnNumbers.join("-")}-${Date.now()}-${baseName}.${uploadExtension}`;
	const response = await imagekit.upload({
		file: uploadBuffer,
		fileName,
		folder,
	});
	return response.url;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, ms, label) =>
	Promise.race([
		promise,
		new Promise((_, reject) => {
			setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
		}),
	]);

const describeError = (error) => {
	if (!error) return "Unknown error";
	if (error instanceof Error) return error.stack || error.message;
	if (typeof error === "string") return error;
	try {
		return JSON.stringify(error, null, 2);
	} catch {
		return String(error);
	}
};

const getCacheKey = async (entry) => {
	const stat = await fs.stat(entry.filePath);
	return `${entry.filePath}|${stat.size}|${stat.mtimeMs}`;
};

const readCache = async (cacheFile) => {
	if (!cacheFile) return {};
	try {
		return JSON.parse(await fs.readFile(cacheFile, "utf8"));
	} catch (error) {
		if (error.code === "ENOENT") return {};
		throw error;
	}
};

const writeCache = async (cacheFile, cache) => {
	if (!cacheFile) return;
	await fs.writeFile(cacheFile, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
};

const uploadFileWithRetry = async (imagekit, entry) => {
	let lastError;
	for (let attempt = 1; attempt <= 4; attempt += 1) {
		try {
			return await withTimeout(uploadFile(imagekit, entry), 45000, `Upload ${entry.fileName}`);
		} catch (error) {
			lastError = error;
			if (attempt === 4) break;
			console.log(`Retrying ${entry.fileName} after upload error, attempt ${attempt + 1}/4`);
			await sleep(1000 * attempt * attempt);
		}
	}
	throw new Error(`Failed to upload ${entry.fileName}:\n${describeError(lastError)}`);
};

const summarizePlan = (entries, hymnCount) => {
	const supported = entries.filter((entry) => entry.type !== "unsupported");
	const unsupported = entries.filter((entry) => entry.type === "unsupported");
	const unmapped = supported.filter((entry) => entry.hymnNumbers.length === 0);
	const outOfRange = supported.filter((entry) =>
		entry.hymnNumbers.some((number) => number > hymnCount)
	);
	const mappedHymns = new Set(
		supported.flatMap((entry) =>
			entry.hymnNumbers.filter((number) => number >= 1 && number <= hymnCount)
		)
	);

	console.log(`Found ${entries.length} files.`);
	console.log(`Mapped ${supported.length - unmapped.length - outOfRange.length} supported files.`);
	console.log(`Affected SDA hymns: ${mappedHymns.size}`);
	if (unsupported.length) {
		console.log(`Unsupported files skipped: ${unsupported.map((entry) => entry.fileName).join(", ")}`);
	}
	if (unmapped.length) {
		console.log(`Files without hymn numbers skipped: ${unmapped.map((entry) => entry.fileName).join(", ")}`);
	}
	if (outOfRange.length) {
		console.log(
			`Files with out-of-range hymn numbers skipped: ${outOfRange
				.map((entry) => entry.fileName)
				.join(", ")}`
		);
	}

	return { supported, unsupported, unmapped, outOfRange, mappedHymns };
};

const main = async () => {
	const options = parseArgs();
	const folder = path.resolve(options.folder);
	const stat = await fs.stat(folder);
	if (!stat.isDirectory()) throw new Error(`Folder does not exist: ${folder}`);

	const data = await readSdaData();
	const hymnCount = getSdaHymnCount(data);
	const allFiles = await walkFiles(folder);
	const entries = allFiles
		.map(parseFileMapping)
		.sort((a, b) => a.hymnNumbers[0] - b.hymnNumbers[0] || a.pageRank - b.pageRank || a.fileName.localeCompare(b.fileName));

	const { supported, unmapped, outOfRange, mappedHymns } = summarizePlan(entries, hymnCount);
	const validEntries = supported.filter(
		(entry) =>
			entry.hymnNumbers.length > 0 &&
			entry.hymnNumbers.every((number) => number >= 1 && number <= hymnCount)
	);

	if (!options.allowSkipped && (unmapped.length || outOfRange.length)) {
		throw new Error("Fix skipped mapped files before importing.");
	}
	if (options.dryRun) {
		for (const number of [...mappedHymns].sort((a, b) => a - b).slice(0, 20)) {
			const files = validEntries
				.filter((entry) => entry.hymnNumbers.includes(number))
				.map((entry) => entry.fileName)
				.join(", ");
			console.log(`Hymn ${number}: ${files}`);
		}
		if (mappedHymns.size > 20) console.log(`...and ${mappedHymns.size - 20} more hymns.`);
		console.log("Dry run complete. No files uploaded and no data changed.");
		return;
	}

	const imagekit = createImageKit();
	const uploadCache = await readCache(options.cacheFile);
	const uploadedByPath = new Map();
	for (const entry of validEntries) {
		const cacheKey = await getCacheKey(entry);
		const wasCached = Boolean(uploadCache[cacheKey]);
		const url = uploadCache[cacheKey] || (await uploadFileWithRetry(imagekit, entry));
		uploadCache[cacheKey] = url;
		await writeCache(options.cacheFile, uploadCache);
		uploadedByPath.set(entry.filePath, url);
		console.log(`${wasCached ? "Reused" : "Uploaded"} ${entry.fileName}`);
	}

	const sheetMusicByHymn = new Map();
	const audioByHymn = new Map();
	for (const entry of validEntries) {
		const url = uploadedByPath.get(entry.filePath);
		for (const hymnNumber of entry.hymnNumbers) {
			if (entry.type === "audio") {
				audioByHymn.set(hymnNumber, url);
			} else {
				const current = sheetMusicByHymn.get(hymnNumber) || [];
				current.push({ url, pageRank: entry.pageRank, fileName: entry.fileName });
				sheetMusicByHymn.set(hymnNumber, current);
			}
		}
	}

	if (options.json) {
		const sheetMusicArray = getOrCreateArray(data, "sheet_music");
		const audioArray = getOrCreateArray(data, "audio");
		while (sheetMusicArray.item.length < hymnCount) sheetMusicArray.item.push("[]");
		while (audioArray.item.length < hymnCount) audioArray.item.push("");

		const numbersToClear = options.clearAll
			? Array.from({ length: hymnCount }, (_, index) => index + 1)
			: [...mappedHymns];
		for (const hymnNumber of numbersToClear) {
			sheetMusicArray.item[hymnNumber - 1] = "[]";
			audioArray.item[hymnNumber - 1] = "";
		}
		for (const [hymnNumber, pages] of sheetMusicByHymn.entries()) {
			const urls = pages
				.sort((a, b) => a.pageRank - b.pageRank || a.fileName.localeCompare(b.fileName))
				.map((page) => page.url);
			sheetMusicArray.item[hymnNumber - 1] = JSON.stringify(urls);
		}
		for (const [hymnNumber, audioUrl] of audioByHymn.entries()) {
			audioArray.item[hymnNumber - 1] = audioUrl;
		}
		await fs.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
		console.log(`Updated ${DATA_FILE}`);
	}

	if (options.mongo) {
		const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
		if (!uri || !uri.startsWith("mongodb")) {
			console.log("No MongoDB URI found; skipped Mongo update.");
		} else {
			await mongoose.connect(uri);
			const numbersToClear = options.clearAll
				? Array.from({ length: hymnCount }, (_, index) => index + 1)
				: [...mappedHymns];
			await SDAHymn.updateMany(
				{ id: { $in: numbersToClear.map((number) => `sda-${number - 1}`) } },
				{ $set: { sheet_music: [], audio: "" } }
			);
			for (const hymnNumber of mappedHymns) {
				const pages = sheetMusicByHymn.get(hymnNumber) || [];
				const sheetMusic = pages
					.sort((a, b) => a.pageRank - b.pageRank || a.fileName.localeCompare(b.fileName))
					.map((page) => page.url);
				const update = { sheet_music: sheetMusic, audio: audioByHymn.get(hymnNumber) || "" };
				await SDAHymn.updateOne({ id: `sda-${hymnNumber - 1}` }, { $set: update });
			}
			await mongoose.disconnect();
			console.log("Updated MongoDB SDA hymns.");
		}
	}
};

main().catch(async (error) => {
	console.error(describeError(error));
	if (mongoose.connection.readyState) await mongoose.disconnect();
	process.exit(1);
});
