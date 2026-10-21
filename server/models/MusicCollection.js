import mongoose from "mongoose";

const musicCollectionSchema = new mongoose.Schema(
	{
		path: { type: String, required: true, unique: true, index: true },
		name: { type: String, required: true },
		parentPath: { type: String, default: null, index: true },
		trackCount: { type: Number, default: 0 },
		// Keep source paths separate from curator choices.
		manual: {
			artworkUrl: String,
			description: String,
			featured: { type: Boolean, default: false },
			published: { type: Boolean, default: true },
			displayOrder: Number,
		},
		lastSeenAt: Date,
	},
	{ timestamps: true }
);

export default mongoose.model("MusicCollection", musicCollectionSchema);
