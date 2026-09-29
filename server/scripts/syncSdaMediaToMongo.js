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

const parseSheetMusic = (raw) => {
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
	const sheetMusic = findArray(data, "sheet_music");
	const audio = findArray(data, "audio");
	const count = sheetMusic.length;

	await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
	for (let index = 0; index < count; index += 1) {
		await SDAHymn.updateOne(
			{ id: `sda-${index}` },
			{
				$set: {
					sheet_music: parseSheetMusic(sheetMusic[index]),
					audio: audio[index] || "",
				},
			}
		);
	}
	await mongoose.disconnect();
	console.log(`Synced SDA media for ${count} hymns to MongoDB.`);
};

main().catch(async (error) => {
	console.error(error?.stack || error?.message || String(error));
	if (mongoose.connection.readyState) await mongoose.disconnect();
	process.exit(1);
});
