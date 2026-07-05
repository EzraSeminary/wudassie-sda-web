import mongoose from "mongoose";

const auditUserSchema = new mongoose.Schema(
	{
		id: { type: String, default: "" },
		email: { type: String, default: "" },
		role: { type: String, default: "" },
	},
	{ _id: false }
);

const hagerignaSchema = new mongoose.Schema(
	{
		id: { type: String, required: true, unique: true },
		artist: { type: String, default: "" },
		song: { type: String, default: "" },
		title: { type: String, default: "" },
		isAlbum: { type: Boolean, default: false },
		albumName: { type: String, default: "" },
		choirName: { type: String, default: "" },
		trackCount: { type: Number, default: 0 },
		tracks: {
			type: [
				{
					id: { type: String, default: "" },
					trackNumber: { type: Number, default: 0 },
					title: { type: String, default: "" },
					song: { type: String, default: "" },
					audio: { type: String, default: "" },
					_id: false,
				},
			],
			default: [],
		},
		category: { type: String, default: "" },
		sheet_music: { type: [String], default: [] },
		audio: { type: String, default: "" },
		createdBy: { type: auditUserSchema, default: null },
		updatedBy: { type: auditUserSchema, default: null },
	},
	{ timestamps: true }
);

hagerignaSchema.set("toJSON", {
	virtuals: false,
	transform: (doc, ret) => {
		ret.createdAt = doc.createdAt ? doc.createdAt.toISOString() : ret.createdAt;
		ret.updatedAt = doc.updatedAt ? doc.updatedAt.toISOString() : ret.updatedAt;
		delete ret._id;
		delete ret.__v;
		return ret;
	},
});

export default mongoose.model("HagerignaHymn", hagerignaSchema);
