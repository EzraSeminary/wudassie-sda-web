import express from "express";
import { body, validationResult } from "express-validator";
import { isMongoConnected } from "../db/mongo.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import MusicTrack from "../models/MusicTrack.js";
import MusicCollection from "../models/MusicCollection.js";
import { Favorite, PlaybackHistory, Playlist, MusicSyncStatus } from "../models/MusicUserData.js";
import { getMusicRoot, syncImageKitMusic } from "../services/imageKitMusicSync.js";

const router = express.Router();
const parsePage = (value, fallback, maximum) => Math.max(1, Math.min(maximum, Number.parseInt(value, 10) || fallback));
const failIfNoDb = (res) => !isMongoConnected() && (res.status(503).json({ error: "Music library needs MongoDB persistence. Configure MONGODB_URI and run an admin sync." }), true);
const respondValidation = (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) { res.status(400).json({ error: errors.array()[0].msg }); return true; }
	return false;
};
const publicTrackFilter = { missingFromSource: false, "manual.published": { $ne: false } };
const cleanTrack = (track) => ({
	id: String(track._id), imageKitFileId: track.imageKitFileId, title: track.manual?.title || track.fileName.replace(/\.[^.]+$/, ""), artist: track.manual?.artist || "", artworkUrl: track.manual?.artworkUrl || "", description: track.manual?.description || "", genres: track.manual?.genres || [], language: track.manual?.language || "", featured: Boolean(track.manual?.featured), fileName: track.fileName, filePath: track.filePath, url: track.url, size: track.size, fileType: track.fileType, mime: track.mime, collectionPath: track.collectionPath, collectionName: track.collectionName, createdAt: track.sourceCreatedAt || track.createdAt, updatedAt: track.sourceUpdatedAt || track.updatedAt, playCount: track.playCount || 0, missingFromSource: Boolean(track.missingFromSource), published: track.manual?.published !== false,
});
const cleanCollection = (collection) => ({ id: String(collection._id), name: collection.name, path: collection.path, parentPath: collection.parentPath, trackCount: collection.trackCount, artworkUrl: collection.manual?.artworkUrl || "", description: collection.manual?.description || "", featured: Boolean(collection.manual?.featured), published: collection.manual?.published !== false });

router.get("/status", async (_req, res) => {
	if (failIfNoDb(res)) return;
	const status = await MusicSyncStatus.findOne({ key: "imagekit" }).lean();
	res.json({ root: getMusicRoot(), configured: Boolean(process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT), status: status || { status: "never", trackCount: 0, collectionCount: 0 } });
});

router.get("/tracks", async (req, res, next) => {
	try {
		if (failIfNoDb(res)) return;
		const page = parsePage(req.query.page, 1, 100000); const limit = parsePage(req.query.limit, 30, 100);
		const query = { ...publicTrackFilter };
		if (req.query.collection) query.collectionPath = String(req.query.collection);
		if (req.query.q) {
			const escaped = String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			query.$or = ["fileName", "filePath", "collectionName", "manual.title", "manual.artist", "manual.language"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } }));
		}
		const sort = req.query.sort === "title" ? { "manual.title": 1, fileName: 1 } : req.query.sort === "plays" ? { playCount: -1, fileName: 1 } : { sourceCreatedAt: -1, fileName: 1 };
		const [items, total] = await Promise.all([MusicTrack.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(), MusicTrack.countDocuments(query)]);
		res.json({ items: items.map(cleanTrack), page, limit, total, hasMore: page * limit < total });
	} catch (error) { next(error); }
});

router.get("/tracks/:id", async (req, res, next) => {
	try { if (failIfNoDb(res)) return; const track = await MusicTrack.findOne({ _id: req.params.id, ...publicTrackFilter }).lean(); if (!track) return res.status(404).json({ error: "Track not found" }); res.json(cleanTrack(track)); } catch (error) { next(error); }
});

router.get("/collections", async (req, res, next) => {
	try {
		if (failIfNoDb(res)) return;
		const query = { "manual.published": { $ne: false } };
		if (req.query.parent === "root") query.parentPath = null;
		else if (req.query.parent) query.parentPath = String(req.query.parent);
		if (req.query.featured === "true") query["manual.featured"] = true;
		const items = await MusicCollection.find(query).sort({ "manual.displayOrder": 1, name: 1 }).lean();
		res.json({ items: items.map(cleanCollection), root: getMusicRoot() });
	} catch (error) { next(error); }
});

router.get("/collections/:id", async (req, res, next) => {
	try {
		if (failIfNoDb(res)) return;
		const collection = await MusicCollection.findOne({ _id: req.params.id, "manual.published": { $ne: false } }).lean();
		if (!collection) return res.status(404).json({ error: "Collection not found" });
		const [children, tracks] = await Promise.all([MusicCollection.find({ parentPath: collection.path, "manual.published": { $ne: false } }).sort({ name: 1 }).lean(), MusicTrack.find({ ...publicTrackFilter, collectionPath: collection.path }).sort({ "manual.displayOrder": 1, fileName: 1 }).lean()]);
		res.json({ ...cleanCollection(collection), children: children.map(cleanCollection), tracks: tracks.map(cleanTrack) });
	} catch (error) { next(error); }
});

router.get("/featured", async (_req, res, next) => {
	try { if (failIfNoDb(res)) return; const [tracks, collections] = await Promise.all([MusicTrack.find({ ...publicTrackFilter, "manual.featured": true }).sort({ "manual.displayOrder": 1 }).limit(24).lean(), MusicCollection.find({ "manual.published": { $ne: false }, "manual.featured": true }).sort({ "manual.displayOrder": 1 }).limit(24).lean()]); res.json({ tracks: tracks.map(cleanTrack), collections: collections.map(cleanCollection) }); } catch (error) { next(error); }
});

router.get("/recent", async (_req, res, next) => {
	try { if (failIfNoDb(res)) return; const tracks = await MusicTrack.find(publicTrackFilter).sort({ sourceCreatedAt: -1 }).limit(24).lean(); res.json({ items: tracks.map(cleanTrack) }); } catch (error) { next(error); }
});
router.get("/search", async (req, res, next) => {
	try {
		if (failIfNoDb(res)) return;
		const term = String(req.query.q || "").trim();
		if (!term) return res.json({ tracks: [], collections: [] });
		const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const matcher = { $regex: escaped, $options: "i" };
		const [tracks, collections] = await Promise.all([
			MusicTrack.find({ ...publicTrackFilter, $or: ["fileName", "filePath", "collectionName", "manual.title", "manual.artist", "manual.language"].map((field) => ({ [field]: matcher })) }).sort({ "manual.title": 1, fileName: 1 }).limit(80).lean(),
			MusicCollection.find({ "manual.published": { $ne: false }, $or: [{ name: matcher }, { path: matcher }] }).sort({ name: 1 }).limit(30).lean(),
		]);
		res.json({ tracks: tracks.map(cleanTrack), collections: collections.map(cleanCollection) });
	} catch (error) { next(error); }
});

router.get("/favorites", requireAuth, async (req, res, next) => {
	try { if (failIfNoDb(res)) return; const rows = await Favorite.find({ userId: req.user.id }).populate("trackId").lean(); res.json({ items: rows.map((row) => row.trackId).filter(Boolean).map(cleanTrack) }); } catch (error) { next(error); }
});
router.post("/favorites", requireAuth, [body("trackId").isMongoId()], async (req, res, next) => {
	try { if (respondValidation(req, res) || failIfNoDb(res)) return; const track = await MusicTrack.findOne({ _id: req.body.trackId, ...publicTrackFilter }); if (!track) return res.status(404).json({ error: "Track not found" }); await Favorite.findOneAndUpdate({ userId: req.user.id, trackId: track._id }, {}, { upsert: true }); res.status(201).json({ track: cleanTrack(track) }); } catch (error) { next(error); }
});
router.delete("/favorites/:trackId", requireAuth, async (req, res, next) => { try { if (failIfNoDb(res)) return; await Favorite.deleteOne({ userId: req.user.id, trackId: req.params.trackId }); res.status(204).send(); } catch (error) { next(error); } });

router.get("/playlists", requireAuth, async (req, res, next) => { try { if (failIfNoDb(res)) return; const rows = await Playlist.find({ userId: req.user.id }).populate("tracks.trackId").sort({ updatedAt: -1 }).lean(); res.json({ items: rows.map((playlist) => ({ id: String(playlist._id), name: playlist.name, tracks: playlist.tracks.sort((a, b) => a.position - b.position).map((entry) => entry.trackId && cleanTrack(entry.trackId)).filter(Boolean), updatedAt: playlist.updatedAt })) }); } catch (error) { next(error); } });
router.post("/playlists", requireAuth, [body("name").trim().isLength({ min: 1, max: 120 })], async (req, res, next) => { try { if (respondValidation(req, res) || failIfNoDb(res)) return; const playlist = await Playlist.create({ userId: req.user.id, name: req.body.name }); res.status(201).json({ id: String(playlist._id), name: playlist.name, tracks: [] }); } catch (error) { next(error); } });
router.patch("/playlists/:id", requireAuth, [body("name").optional().trim().isLength({ min: 1, max: 120 }), body("trackIds").optional().isArray({ max: 1000 })], async (req, res, next) => { try { if (respondValidation(req, res) || failIfNoDb(res)) return; const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.user.id }); if (!playlist) return res.status(404).json({ error: "Playlist not found" }); if (req.body.name) playlist.name = req.body.name; if (Array.isArray(req.body.trackIds)) playlist.tracks = req.body.trackIds.map((trackId, position) => ({ trackId, position })); await playlist.save(); res.json({ id: String(playlist._id), name: playlist.name }); } catch (error) { next(error); } });
router.delete("/playlists/:id", requireAuth, async (req, res, next) => { try { if (failIfNoDb(res)) return; const result = await Playlist.deleteOne({ _id: req.params.id, userId: req.user.id }); if (!result.deletedCount) return res.status(404).json({ error: "Playlist not found" }); res.status(204).send(); } catch (error) { next(error); } });

router.post("/history", requireAuth, [body("trackId").isMongoId(), body("position").optional().isFloat({ min: 0, max: 604800 })], async (req, res, next) => { try { if (respondValidation(req, res) || failIfNoDb(res)) return; const track = await MusicTrack.findOne({ _id: req.body.trackId, ...publicTrackFilter }); if (!track) return res.status(404).json({ error: "Track not found" }); await Promise.all([PlaybackHistory.create({ userId: req.user.id, trackId: track._id, position: req.body.position || 0 }), MusicTrack.updateOne({ _id: track._id }, { $inc: { playCount: 1 } })]); res.status(201).json({ ok: true }); } catch (error) { next(error); } });
router.get("/history", requireAuth, async (req, res, next) => { try { if (failIfNoDb(res)) return; const rows = await PlaybackHistory.find({ userId: req.user.id }).sort({ playedAt: -1 }).limit(30).populate("trackId").lean(); const unique = new Map(); rows.forEach((row) => row.trackId && !unique.has(String(row.trackId._id)) && unique.set(String(row.trackId._id), cleanTrack(row.trackId))); res.json({ items: [...unique.values()] }); } catch (error) { next(error); } });

router.post("/admin/sync", requireAdmin, async (_req, res, next) => { try { if (failIfNoDb(res)) return; const status = await syncImageKitMusic(); res.json({ status }); } catch (error) { next(error); } });
router.get("/admin/tracks", requireAdmin, async (req, res, next) => { try { if (failIfNoDb(res)) return; const tracks = await MusicTrack.find(req.query.missing === "true" ? { missingFromSource: true } : {}).sort({ updatedAt: -1 }).limit(500).lean(); res.json({ items: tracks.map(cleanTrack) }); } catch (error) { next(error); } });
router.patch("/admin/tracks/:id", requireAdmin, async (req, res, next) => { try { if (failIfNoDb(res)) return; const allowed = ["title", "artist", "artworkUrl", "description", "genres", "language", "featured", "published", "displayOrder"]; const manual = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key))); const track = await MusicTrack.findByIdAndUpdate(req.params.id, { $set: Object.fromEntries(Object.entries(manual).map(([key, value]) => [`manual.${key}`, value])) }, { new: true }).lean(); if (!track) return res.status(404).json({ error: "Track not found" }); res.json(cleanTrack(track)); } catch (error) { next(error); } });
router.patch("/admin/collections/:id", requireAdmin, async (req, res, next) => { try { if (failIfNoDb(res)) return; const allowed = ["artworkUrl", "description", "featured", "published", "displayOrder"]; const manual = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key))); const collection = await MusicCollection.findByIdAndUpdate(req.params.id, { $set: Object.fromEntries(Object.entries(manual).map(([key, value]) => [`manual.${key}`, value])) }, { new: true }).lean(); if (!collection) return res.status(404).json({ error: "Collection not found" }); res.json(cleanCollection(collection)); } catch (error) { next(error); } });

export default router;
