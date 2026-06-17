import express from "express";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth.js";
import {
	readJsonFile,
	appendToHagerignaFile,
	appendToSDAFile,
	updateHagerignaFile,
	updateSDAFile,
	deleteFromHagerignaFile,
	deleteFromSDAFile,
} from "../utils/fileUtils.js";
import { isMongoConnected } from "../db/mongo.js";
import HagerignaHymn from "../models/HagerignaHymn.js";
import SDAHymn from "../models/SDAHymn.js";
import Category from "../models/Category.js";

const router = express.Router();

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

const parseSheetMusic = (raw) => {
	if (Array.isArray(raw)) return raw;
	try {
		const parsed = JSON.parse(raw || "[]");
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const getAuditActor = (req) => ({
	id: String(req.user?.id || ""),
	email: String(req.user?.email || ""),
	role: String(req.user?.role || ""),
});

const ensureCategory = async (name) => {
	const value = String(name || "").trim();
	if (!value || !isMongoConnected()) return;
	const slug = toSlug(value);
	await Category.updateOne(
		{ slug },
		{
			$setOnInsert: {
				id: `category-${slug}`,
				name: value,
				slug,
				description: "",
			},
		},
		{ upsert: true }
	);
};

const getHagerignaFromJson = async () => {
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
	const sheetMusicArray =
		data.resources?.array?.find((arr) => arr._name === "sheet_music")?.item || [];
	const audioArray =
		data.resources?.array?.find((arr) => arr._name === "audio")?.item || [];

	const maxLength = Math.max(artistArray.length, songArray.length, titleArray.length);
	const hymns = [];
	for (let i = 0; i < maxLength; i++) {
		const sheetMusic = parseSheetMusic(sheetMusicArray[i]);
		hymns.push({
			id: `hagerigna-${i}`,
			artist: artistArray[i] || "",
			song: songArray[i] || "",
			title: titleArray[i] || "",
			category: categoryArray[i] || undefined,
			sheet_music: sheetMusic.length ? sheetMusic : undefined,
			audio: audioArray[i] || undefined,
		});
	}
	return hymns;
};

const getSdaFromJson = async () => {
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
	const sheetMusicArray =
		data.resources?.array?.find((arr) => arr._name === "sheet_music")?.item || [];
	const audioArray =
		data.resources?.array?.find((arr) => arr._name === "audio")?.item || [];

	const maxLength = Math.max(
		newTitleArray.length,
		oldTitleArray.length,
		newLyricsArray.length,
		englishTitleArray.length,
		oldLyricsArray.length
	);
	const hymns = [];
	for (let i = 0; i < maxLength; i++) {
		const sheetMusic = parseSheetMusic(sheetMusicArray[i]);
		hymns.push({
			id: `sda-${i}`,
			newHymnalTitle: newTitleArray[i] || "",
			oldHymnalTitle: oldTitleArray[i] || "",
			newHymnalLyrics: newLyricsArray[i] || "",
			englishTitleOld: englishTitleArray[i] || "",
			oldHymnalLyrics: oldLyricsArray[i] || "",
			category: categoryArray[i] || undefined,
			sheet_music: sheetMusic.length ? sheetMusic : undefined,
			audio: audioArray[i] || undefined,
		});
	}
	return hymns;
};

const toMongoSafeHagerigna = (doc) => ({
	id: doc.id,
	artist: doc.artist || "",
	song: doc.song || "",
	title: doc.title || "",
	category: doc.category || undefined,
	sheet_music: Array.isArray(doc.sheet_music) && doc.sheet_music.length ? doc.sheet_music : undefined,
	audio: doc.audio || undefined,
	createdBy: doc.createdBy || null,
	updatedBy: doc.updatedBy || null,
	createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
	updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
});

const toMongoSafeSda = (doc) => ({
	id: doc.id,
	newHymnalTitle: doc.newHymnalTitle || "",
	oldHymnalTitle: doc.oldHymnalTitle || "",
	newHymnalLyrics: doc.newHymnalLyrics || "",
	englishTitleOld: doc.englishTitleOld || "",
	oldHymnalLyrics: doc.oldHymnalLyrics || "",
	category: doc.category || undefined,
	sheet_music: Array.isArray(doc.sheet_music) && doc.sheet_music.length ? doc.sheet_music : undefined,
	audio: doc.audio || undefined,
	createdBy: doc.createdBy || null,
	updatedBy: doc.updatedBy || null,
	createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
	updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
});

router.get("/categories", async (req, res) => {
	try {
		if (!isMongoConnected()) {
			return res.json(
				DEFAULT_CATEGORIES.map((name) => ({
					id: `category-${toSlug(name)}`,
					name,
					slug: toSlug(name),
				}))
			);
		}

		for (const name of DEFAULT_CATEGORIES) {
			await ensureCategory(name);
		}
		const rows = await Category.find().sort({ name: 1 }).lean();
		res.json(
			rows.map((row) => ({
				id: row.id,
				name: row.name,
				slug: row.slug,
				description: row.description || "",
			}))
		);
	} catch (error) {
		console.error("Error fetching categories:", error);
		res.status(500).json({ error: "Failed to fetch categories" });
	}
});

router.get("/hagerigna", async (req, res) => {
	try {
		if (!isMongoConnected()) {
			return res.json(await getHagerignaFromJson());
		}
		const rows = await HagerignaHymn.find().sort({ createdAt: 1 }).lean();
		res.json(rows.map(toMongoSafeHagerigna));
	} catch (error) {
		console.error("Error fetching Hagerigna hymns:", error);
		res.status(500).json({ error: "Failed to fetch Hagerigna hymns" });
	}
});

router.get("/sda", async (req, res) => {
	try {
		if (!isMongoConnected()) {
			return res.json(await getSdaFromJson());
		}
		const rows = await SDAHymn.find().sort({ createdAt: 1 }).lean();
		res.json(rows.map(toMongoSafeSda));
	} catch (error) {
		console.error("Error fetching SDA hymns:", error);
		res.status(500).json({ error: "Failed to fetch SDA hymns" });
	}
});

router.post("/hagerigna", requireAuth, async (req, res) => {
	try {
		const actor = getAuditActor(req);
		if (!isMongoConnected()) {
			const savedHymn = await appendToHagerignaFile({
				...req.body,
				createdBy: actor,
				updatedBy: actor,
			});
			return res.status(201).json(savedHymn);
		}
		const payload = {
			id: `hagerigna-${uuidv4()}`,
			artist: req.body.artist || "",
			song: req.body.song || "",
			title: req.body.title || "",
			category: req.body.category || "",
			sheet_music: Array.isArray(req.body.sheet_music) ? req.body.sheet_music : [],
			audio: req.body.audio || "",
			createdBy: actor,
			updatedBy: actor,
		};
		const created = await HagerignaHymn.create(payload);
		await ensureCategory(payload.category);
		res.status(201).json(toMongoSafeHagerigna(created.toObject()));
	} catch (error) {
		console.error("Error adding Hagerigna hymn:", error);
		res.status(500).json({ error: "Failed to add Hagerigna hymn" });
	}
});

router.post("/sda", requireAuth, async (req, res) => {
	try {
		const actor = getAuditActor(req);
		if (!isMongoConnected()) {
			const savedHymn = await appendToSDAFile({
				...req.body,
				createdBy: actor,
				updatedBy: actor,
			});
			return res.status(201).json(savedHymn);
		}
		const payload = {
			id: `sda-${uuidv4()}`,
			newHymnalTitle: req.body.newHymnalTitle || "",
			oldHymnalTitle: req.body.oldHymnalTitle || "",
			newHymnalLyrics: req.body.newHymnalLyrics || "",
			englishTitleOld: req.body.englishTitleOld || "",
			oldHymnalLyrics: req.body.oldHymnalLyrics || "",
			category: req.body.category || "",
			sheet_music: Array.isArray(req.body.sheet_music) ? req.body.sheet_music : [],
			audio: req.body.audio || "",
			createdBy: actor,
			updatedBy: actor,
		};
		const created = await SDAHymn.create(payload);
		await ensureCategory(payload.category);
		res.status(201).json(toMongoSafeSda(created.toObject()));
	} catch (error) {
		console.error("Error adding SDA hymn:", error);
		res.status(500).json({ error: "Failed to add SDA hymn" });
	}
});

router.put("/hagerigna/:id", requireAuth, async (req, res) => {
	try {
		const actor = getAuditActor(req);
		if (!isMongoConnected()) {
			const updatedHymn = await updateHagerignaFile(req.params.id, {
				...req.body,
				updatedBy: actor,
			});
			return res.json(updatedHymn);
		}
		const update = {
			...(req.body.artist !== undefined ? { artist: req.body.artist } : {}),
			...(req.body.song !== undefined ? { song: req.body.song } : {}),
			...(req.body.title !== undefined ? { title: req.body.title } : {}),
			...(req.body.category !== undefined ? { category: req.body.category } : {}),
			...(req.body.sheet_music !== undefined ? { sheet_music: req.body.sheet_music } : {}),
			...(req.body.audio !== undefined ? { audio: req.body.audio } : {}),
			updatedBy: actor,
		};
		const updated = await HagerignaHymn.findOneAndUpdate(
			{ id: req.params.id },
			{ $set: update },
			{ new: true }
		).lean();
		if (!updated) return res.status(404).json({ error: "Hymn not found" });
		await ensureCategory(updated.category);
		res.json(toMongoSafeHagerigna(updated));
	} catch (error) {
		console.error("Error updating Hagerigna hymn:", error);
		res.status(500).json({ error: "Failed to update Hagerigna hymn" });
	}
});

router.put("/sda/:id", requireAuth, async (req, res) => {
	try {
		const actor = getAuditActor(req);
		if (!isMongoConnected()) {
			const updatedHymn = await updateSDAFile(req.params.id, {
				...req.body,
				updatedBy: actor,
			});
			return res.json(updatedHymn);
		}
		const update = {
			...(req.body.newHymnalTitle !== undefined ? { newHymnalTitle: req.body.newHymnalTitle } : {}),
			...(req.body.oldHymnalTitle !== undefined ? { oldHymnalTitle: req.body.oldHymnalTitle } : {}),
			...(req.body.newHymnalLyrics !== undefined ? { newHymnalLyrics: req.body.newHymnalLyrics } : {}),
			...(req.body.englishTitleOld !== undefined ? { englishTitleOld: req.body.englishTitleOld } : {}),
			...(req.body.oldHymnalLyrics !== undefined ? { oldHymnalLyrics: req.body.oldHymnalLyrics } : {}),
			...(req.body.category !== undefined ? { category: req.body.category } : {}),
			...(req.body.sheet_music !== undefined ? { sheet_music: req.body.sheet_music } : {}),
			...(req.body.audio !== undefined ? { audio: req.body.audio } : {}),
			updatedBy: actor,
		};
		const updated = await SDAHymn.findOneAndUpdate(
			{ id: req.params.id },
			{ $set: update },
			{ new: true }
		).lean();
		if (!updated) return res.status(404).json({ error: "Hymn not found" });
		await ensureCategory(updated.category);
		res.json(toMongoSafeSda(updated));
	} catch (error) {
		console.error("Error updating SDA hymn:", error);
		res.status(500).json({ error: "Failed to update SDA hymn" });
	}
});

router.delete("/hagerigna/:id", requireAuth, async (req, res) => {
	try {
		if (!isMongoConnected()) {
			await deleteFromHagerignaFile(req.params.id);
			return res.status(204).send();
		}
		const result = await HagerignaHymn.deleteOne({ id: req.params.id });
		if (!result.deletedCount) return res.status(404).json({ error: "Hymn not found" });
		res.status(204).send();
	} catch (error) {
		console.error("Error deleting Hagerigna hymn:", error);
		res.status(500).json({ error: "Failed to delete Hagerigna hymn" });
	}
});

router.delete("/sda/:id", requireAuth, async (req, res) => {
	try {
		if (!isMongoConnected()) {
			await deleteFromSDAFile(req.params.id);
			return res.status(204).send();
		}
		const result = await SDAHymn.deleteOne({ id: req.params.id });
		if (!result.deletedCount) return res.status(404).json({ error: "Hymn not found" });
		res.status(204).send();
	} catch (error) {
		console.error("Error deleting SDA hymn:", error);
		res.status(500).json({ error: "Failed to delete SDA hymn" });
	}
});

router.get("/hagerigna/search", async (req, res) => {
	try {
		const query = String(req.query.q || "").toLowerCase();
		if (!query) return res.json([]);

		if (!isMongoConnected()) {
			const hymns = await getHagerignaFromJson();
			return res.json(
				hymns.filter(
					(h) =>
						h.artist.toLowerCase().includes(query) ||
						h.song.toLowerCase().includes(query) ||
						h.title.toLowerCase().includes(query)
				)
			);
		}

		const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
		const rows = await HagerignaHymn.find({
			$or: [{ artist: regex }, { song: regex }, { title: regex }],
		})
			.sort({ createdAt: 1 })
			.lean();
		res.json(rows.map(toMongoSafeHagerigna));
	} catch (error) {
		console.error("Error searching Hagerigna hymns:", error);
		res.status(500).json({ error: "Failed to search Hagerigna hymns" });
	}
});

router.get("/sda/search", async (req, res) => {
	try {
		const query = String(req.query.q || "").toLowerCase();
		if (!query) return res.json([]);

		if (!isMongoConnected()) {
			const hymns = await getSdaFromJson();
			return res.json(
				hymns.filter(
					(h) =>
						h.newHymnalTitle.toLowerCase().includes(query) ||
						h.oldHymnalTitle.toLowerCase().includes(query) ||
						h.englishTitleOld.toLowerCase().includes(query) ||
						h.newHymnalLyrics.toLowerCase().includes(query) ||
						h.oldHymnalLyrics.toLowerCase().includes(query)
				)
			);
		}

		const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
		const rows = await SDAHymn.find({
			$or: [
				{ newHymnalTitle: regex },
				{ oldHymnalTitle: regex },
				{ englishTitleOld: regex },
				{ newHymnalLyrics: regex },
				{ oldHymnalLyrics: regex },
			],
		})
			.sort({ createdAt: 1 })
			.lean();
		res.json(rows.map(toMongoSafeSda));
	} catch (error) {
		console.error("Error searching SDA hymns:", error);
		res.status(500).json({ error: "Failed to search SDA hymns" });
	}
});

export default router;
