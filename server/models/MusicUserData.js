import mongoose from "mongoose";

const playlistTrackSchema = new mongoose.Schema(
	{ trackId: { type: mongoose.Schema.Types.ObjectId, ref: "MusicTrack", required: true }, position: { type: Number, required: true } },
	{ _id: false }
);

export const Playlist = mongoose.model("MusicPlaylist", new mongoose.Schema({
	userId: { type: String, required: true, index: true },
	name: { type: String, required: true, trim: true, maxlength: 120 },
	tracks: { type: [playlistTrackSchema], default: [] },
}, { timestamps: true }));

export const Favorite = mongoose.model("MusicFavorite", new mongoose.Schema({
	userId: { type: String, required: true, index: true },
	trackId: { type: mongoose.Schema.Types.ObjectId, ref: "MusicTrack", required: true, index: true },
}, { timestamps: true }));
Favorite.schema.index({ userId: 1, trackId: 1 }, { unique: true });

export const PlaybackHistory = mongoose.model("MusicPlaybackHistory", new mongoose.Schema({
	userId: { type: String, required: true, index: true },
	trackId: { type: mongoose.Schema.Types.ObjectId, ref: "MusicTrack", required: true, index: true },
	position: { type: Number, default: 0 },
	playedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true }));

export const MusicSyncStatus = mongoose.model("MusicSyncStatus", new mongoose.Schema({
	key: { type: String, default: "imagekit", unique: true },
	status: { type: String, default: "never" },
	startedAt: Date,
	finishedAt: Date,
	trackCount: { type: Number, default: 0 },
	collectionCount: { type: Number, default: 0 },
	error: String,
}, { timestamps: true }));
