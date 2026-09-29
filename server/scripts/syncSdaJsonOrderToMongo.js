import fs from "fs/promises";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import SDAHymn from "../models/SDAHymn.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../database/SDA_Hymnal.json");
const BASE_DATE = new Date("2020-01-01T00:00:00.000Z");

const parseSheetMusic = (raw) => {
	if (Array.isArray(raw)) return raw.filter(Boolean);
	try {
		const parsed = JSON.parse(raw || "[]");
		return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
	} catch {
		return [];
	}
};

const findArray = (data, name) =>
	data.resources?.array?.find((entry) => entry._name === name)?.item || [];

const main = async () => {
	const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
	if (!uri) throw new Error("MONGODB_URI or MONGO_URI is required.");

	const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
	const newTitle = findArray(data, "new_title_forbookmark");
	const oldTitle = findArray(data, "old_title_forbookmark");
	const newLyrics = findArray(data, "new_song");
	const englishTitle = findArray(data, "new_title_en");
	const oldLyrics = findArray(data, "old_song");
	const category = findArray(data, "category");
	const key = findArray(data, "key");
	const sheetMusic = findArray(data, "sheet_music");
	const audio = findArray(data, "audio");

	const count = Math.max(
		newTitle.length,
		oldTitle.length,
		newLyrics.length,
		englishTitle.length,
		oldLyrics.length
	);

	await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
	for (let index = 0; index < count; index += 1) {
		const hymnId = `sda-${index + 1}`;
		const orderedTimestamp = new Date(BASE_DATE.getTime() + index * 1000);
		await SDAHymn.updateOne(
			{ id: hymnId },
			{
				$set: {
					id: hymnId,
					newHymnalTitle: newTitle[index] || "",
					oldHymnalTitle: oldTitle[index] || "",
					newHymnalLyrics: newLyrics[index] || "",
					englishTitleOld: englishTitle[index] || "",
					oldHymnalLyrics: oldLyrics[index] || "",
					category: category[index] || "",
					key: key[index] || "",
					sheet_music: parseSheetMusic(sheetMusic[index]),
					audio: audio[index] || "",
					createdAt: orderedTimestamp,
					updatedAt: orderedTimestamp,
				},
				$setOnInsert: {
					createdBy: null,
					updatedBy: null,
				},
			},
			{ upsert: true, timestamps: false }
		);
	}
	await SDAHymn.deleteOne({ id: "sda-0" });

	await mongoose.disconnect();
	console.log(`Synced ${count} SDA hymns to Mongo in JSON order.`);
	console.log(`First hymn: sda-1 ${newTitle[0] || ""}`);
	console.log(`Last hymn: sda-${count} ${newTitle[count - 1] || ""}`);
};

main().catch(async (error) => {
	console.error(error?.stack || error?.message || String(error));
	if (mongoose.connection.readyState) await mongoose.disconnect();
	process.exit(1);
});
