import express from "express";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin } from "../middleware/auth.js";
import { isMongoConnected } from "../db/mongo.js";
import HymnSuggestion from "../models/HymnSuggestion.js";
import HagerignaHymn from "../models/HagerignaHymn.js";
import SDAHymn from "../models/SDAHymn.js";
import {
	readJsonFile,
	readJsonFileOrDefault,
	updateHagerignaFile,
	updateSDAFile,
	writeJsonFile,
} from "../utils/fileUtils.js";

const router = express.Router();
const SUGGESTIONS_FILE = "Suggestions.json";

const getAuditActor = (req) => ({
	id: String(req.user?.id || ""),
	email: String(req.user?.email || ""),
	role: String(req.user?.role || ""),
});

const allowedFields = {
	hagerigna: [
		"artist",
		"song",
		"title",
		"category",
		"key",
		"sheet_music",
		"audio",
		"isAlbum",
		"albumName",
		"choirName",
		"trackCount",
		"tracks",
	],
	sda: [
		"newHymnalTitle",
		"oldHymnalTitle",
		"newHymnalLyrics",
		"englishTitleOld",
		"oldHymnalLyrics",
		"category",
		"key",
		"sheet_music",
		"audio",
	],
};

const cleanText = (value) => String(value || "").trim();

const pickAllowedFields = (type, data = {}) =>
	Object.fromEntries(
		allowedFields[type]
			.filter((field) => data[field] !== undefined)
			.map((field) => [field, data[field]])
	);

const parseTrackTarget = (id) => {
	const marker = "-track-";
	const value = String(id || "");
	const index = value.indexOf(marker);
	if (index < 0) return null;
	return {
		parentId: value.slice(0, index),
		trackId: value.slice(index + marker.length),
	};
};

const getApplyTargetId = (suggestion) => {
	const trackTarget = suggestion.hymnalType === "hagerigna"
		? parseTrackTarget(suggestion.hymnId)
		: null;
	return trackTarget?.parentId || suggestion.hymnId;
};

const normalizeSuggestion = (row) => ({
	id: row.id,
	hymnalType: row.hymnalType,
	hymnId: row.hymnId,
	hymnTitle: row.hymnTitle || "",
	originalData: row.originalData || {},
	requestedData: row.requestedData || {},
	submitterName: row.submitterName || "",
	submitterEmail: row.submitterEmail || "",
	note: row.note || "",
	status: row.status || "pending",
	createdAt: row.createdAt || new Date().toISOString(),
	updatedAt: row.updatedAt || row.createdAt || new Date().toISOString(),
	appliedAt: row.appliedAt || null,
	appliedBy: row.appliedBy || null,
});

const readJsonSuggestions = async () => {
	const rows = await readJsonFileOrDefault(SUGGESTIONS_FILE, []);
	return rows.map(normalizeSuggestion);
};

const writeJsonSuggestions = async (rows) => {
	await writeJsonFile(SUGGESTIONS_FILE, rows.map(normalizeSuggestion));
};

const getJsonSuggestionById = async (id) => {
	const rows = await readJsonSuggestions();
	return { rows, suggestion: rows.find((row) => row.id === id) || null };
};

const parseJsonArrayValue = (value, fallback = []) => {
	try {
		const parsed = JSON.parse(value || JSON.stringify(fallback));
		return Array.isArray(parsed) ? parsed : fallback;
	} catch {
		return fallback;
	}
};

const getJsonHagerignaById = async (id) => {
	const data = await readJsonFile("HagerignaData.json");
	const findArray = (name) => data.resources?.array?.find((arr) => arr._name === name)?.item || [];
	const index = Number.parseInt(String(id).replace("hagerigna-", ""), 10);
	if (!Number.isInteger(index) || index < 0) return null;
	const artistArray = findArray("song_author_text");
	const songArray = findArray("song_text");
	const titleArray = findArray("song_title_text");
	if (index >= Math.max(artistArray.length, songArray.length, titleArray.length)) return null;
	const tracksArray = findArray("tracks");
	const sheetMusicArray = findArray("sheet_music");
	const keyArray = findArray("key");
	return {
		id,
		artist: artistArray[index] || "",
		song: songArray[index] || "",
		title: titleArray[index] || "",
		category: findArray("category")[index] || "",
		key: keyArray[index] || "",
		sheet_music: parseJsonArrayValue(sheetMusicArray[index]),
		audio: findArray("audio")[index] || "",
		isAlbum: findArray("is_album")[index] === "true",
		albumName: findArray("album_name")[index] || "",
		choirName: findArray("choir_name")[index] || "",
		trackCount: Number(findArray("track_count")[index]) || 0,
		tracks: parseJsonArrayValue(tracksArray[index]),
	};
};

const getMongoHymnExists = async (type, hymnId) => {
	if (type === "sda") {
		return Boolean(await SDAHymn.exists({ id: hymnId }));
	}
	const targetId = parseTrackTarget(hymnId)?.parentId || hymnId;
	return Boolean(await HagerignaHymn.exists({ id: targetId }));
};

const applyMongoSuggestion = async (suggestion, actor) => {
	const update = {
		...pickAllowedFields(suggestion.hymnalType, suggestion.requestedData),
		updatedBy: actor,
	};
	if (suggestion.hymnalType === "sda") {
		const updated = await SDAHymn.findOneAndUpdate(
			{ id: suggestion.hymnId },
			{ $set: update },
			{ new: true }
		);
		if (!updated) throw new Error("Hymn not found");
		return;
	}

	const trackTarget = parseTrackTarget(suggestion.hymnId);
	if (!trackTarget) {
		const updated = await HagerignaHymn.findOneAndUpdate(
			{ id: suggestion.hymnId },
			{ $set: update },
			{ new: true }
		);
		if (!updated) throw new Error("Hymn not found");
		return;
	}

	const parent = await HagerignaHymn.findOne({ id: trackTarget.parentId });
	if (!parent) throw new Error("Hymn not found");
	const trackIndex = parent.tracks.findIndex(
		(track) => String(track.id || track.trackNumber) === trackTarget.trackId
	);
	if (trackIndex < 0) throw new Error("Track not found");
	const requested = suggestion.requestedData || {};
	const currentTrack = parent.tracks[trackIndex].toObject?.() || parent.tracks[trackIndex];
	parent.tracks[trackIndex] = {
		...currentTrack,
		title: requested.title ?? currentTrack.title,
		song: requested.song ?? currentTrack.song,
		key: requested.key ?? currentTrack.key,
		audio: requested.audio ?? currentTrack.audio,
	};
	await parent.save();
};

const applyJsonSuggestion = async (suggestion, actor) => {
	const update = {
		...pickAllowedFields(suggestion.hymnalType, suggestion.requestedData),
		updatedBy: actor,
	};
	if (suggestion.hymnalType === "sda") {
		await updateSDAFile(suggestion.hymnId, update);
		return;
	}
	const trackTarget = parseTrackTarget(suggestion.hymnId);
	if (trackTarget) {
		const parent = await getJsonHagerignaById(trackTarget.parentId);
		if (!parent) throw new Error("Hymn not found");
		const requested = suggestion.requestedData || {};
		const tracks = (parent.tracks || []).map((track) =>
			String(track.id || track.trackNumber) === trackTarget.trackId
				? {
					...track,
					title: requested.title ?? track.title,
					song: requested.song ?? track.song,
					key: requested.key ?? track.key,
					audio: requested.audio ?? track.audio,
				}
				: track
		);
		if (tracks.every((track, index) => track === (parent.tracks || [])[index])) {
			throw new Error("Track not found");
		}
		await updateHagerignaFile(trackTarget.parentId, { tracks, trackCount: tracks.length, updatedBy: actor });
		return;
	}
	const targetId = getApplyTargetId(suggestion);
	await updateHagerignaFile(targetId, update);
};

router.post("/suggestions", async (req, res) => {
	const hymnalType = req.body?.hymnalType;
	const hymnId = cleanText(req.body?.hymnId);
	const requestedData = pickAllowedFields(hymnalType, req.body?.requestedData || {});

	if (!["hagerigna", "sda"].includes(hymnalType)) {
		return res.status(400).json({ error: "Valid hymnal type is required" });
	}
	if (!hymnId) {
		return res.status(400).json({ error: "Hymn id is required" });
	}
	if (Object.keys(requestedData).length === 0) {
		return res.status(400).json({ error: "At least one suggested field is required" });
	}

	try {
		if (isMongoConnected()) {
			const exists = await getMongoHymnExists(hymnalType, hymnId);
			if (!exists) return res.status(404).json({ error: "Hymn not found" });
			const created = await HymnSuggestion.create({
				id: `suggestion-${uuidv4()}`,
				hymnalType,
				hymnId,
				hymnTitle: cleanText(req.body?.hymnTitle),
				originalData: pickAllowedFields(hymnalType, req.body?.originalData || {}),
				requestedData,
				submitterName: cleanText(req.body?.submitterName),
				submitterEmail: cleanText(req.body?.submitterEmail),
				note: cleanText(req.body?.note),
				status: "pending",
			});
			return res.status(201).json(created.toJSON());
		}

		const rows = await readJsonSuggestions();
		const now = new Date().toISOString();
		const suggestion = normalizeSuggestion({
			id: `suggestion-${uuidv4()}`,
			hymnalType,
			hymnId,
			hymnTitle: cleanText(req.body?.hymnTitle),
			originalData: pickAllowedFields(hymnalType, req.body?.originalData || {}),
			requestedData,
			submitterName: cleanText(req.body?.submitterName),
			submitterEmail: cleanText(req.body?.submitterEmail),
			note: cleanText(req.body?.note),
			status: "pending",
			createdAt: now,
			updatedAt: now,
		});
		rows.unshift(suggestion);
		await writeJsonSuggestions(rows);
		res.status(201).json(suggestion);
	} catch (error) {
		console.error("Create suggestion error:", error);
		res.status(500).json({ error: "Failed to submit suggestion" });
	}
});

router.get("/suggestions", requireAdmin, async (req, res) => {
	try {
		if (isMongoConnected()) {
			const rows = await HymnSuggestion.find().sort({ createdAt: -1 }).lean();
			return res.json(rows.map(normalizeSuggestion));
		}
		res.json(await readJsonSuggestions());
	} catch (error) {
		console.error("List suggestions error:", error);
		res.status(500).json({ error: "Failed to load suggestions" });
	}
});

router.post("/suggestions/:id/apply", requireAdmin, async (req, res) => {
	try {
		const actor = getAuditActor(req);
		if (isMongoConnected()) {
			const suggestion = await HymnSuggestion.findOne({ id: req.params.id });
			if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
			if (suggestion.status !== "pending") {
				return res.status(400).json({ error: "Suggestion has already been applied" });
			}
			await applyMongoSuggestion(suggestion.toObject(), actor);
			suggestion.status = "applied";
			suggestion.appliedAt = new Date();
			suggestion.appliedBy = actor;
			await suggestion.save();
			return res.json(suggestion.toJSON());
		}

		const { rows, suggestion } = await getJsonSuggestionById(req.params.id);
		if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
		if (suggestion.status !== "pending") {
			return res.status(400).json({ error: "Suggestion has already been applied" });
		}
		await applyJsonSuggestion(suggestion, actor);
		const now = new Date().toISOString();
		const updated = {
			...suggestion,
			status: "applied",
			appliedAt: now,
			appliedBy: actor,
			updatedAt: now,
		};
		await writeJsonSuggestions(rows.map((row) => (row.id === suggestion.id ? updated : row)));
		res.json(updated);
	} catch (error) {
		console.error("Apply suggestion error:", error);
		res.status(500).json({ error: error.message || "Failed to apply suggestion" });
	}
});

export default router;
