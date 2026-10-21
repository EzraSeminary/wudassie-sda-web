import mongoose from "mongoose";

const musicTrackSchema = new mongoose.Schema(
	{
		imageKitFileId: { type: String, required: true, unique: true, index: true },
		fileName: { type: String, required: true },
		filePath: { type: String, required: true, index: true },
		url: { type: String, required: true },
		fileType: String,
		mime: String,
		size: Number,
		sourceCreatedAt: Date,
		sourceUpdatedAt: Date,
		collectionPath: { type: String, default: "/", index: true },
		collectionName: { type: String, default: "Music" },
		// ImageKit data above is only ever changed by synchronization.  Editors own this block.
		manual: {
			title: String,
			artist: String,
			artworkUrl: String,
			description: String,
			genres: [String],
			language: String,
			featured: { type: Boolean, default: false },
			published: { type: Boolean, default: true },
			displayOrder: Number,
		},
		missingFromSource: { type: Boolean, default: false, index: true },
		lastSeenAt: Date,
		playCount: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

musicTrackSchema.index({ collectionPath: 1, "manual.displayOrder": 1, fileName: 1 });
export default mongoose.model("MusicTrack", musicTrackSchema);
