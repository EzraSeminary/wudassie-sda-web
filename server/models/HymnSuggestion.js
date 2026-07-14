import mongoose from "mongoose";

const auditUserSchema = new mongoose.Schema(
	{
		id: { type: String, default: "" },
		email: { type: String, default: "" },
		role: { type: String, default: "" },
	},
	{ _id: false }
);

const suggestionSchema = new mongoose.Schema(
	{
		id: { type: String, required: true, unique: true },
		hymnalType: { type: String, enum: ["hagerigna", "sda"], required: true },
		hymnId: { type: String, required: true },
		hymnTitle: { type: String, default: "" },
		originalData: { type: mongoose.Schema.Types.Mixed, default: {} },
		requestedData: { type: mongoose.Schema.Types.Mixed, default: {} },
		submitterName: { type: String, default: "" },
		submitterEmail: { type: String, default: "" },
		note: { type: String, default: "" },
		status: { type: String, enum: ["pending", "applied"], default: "pending" },
		appliedAt: { type: Date, default: null },
		appliedBy: { type: auditUserSchema, default: null },
	},
	{ timestamps: true }
);

suggestionSchema.set("toJSON", {
	virtuals: false,
	transform: (doc, ret) => {
		ret.createdAt = doc.createdAt ? doc.createdAt.toISOString() : ret.createdAt;
		ret.updatedAt = doc.updatedAt ? doc.updatedAt.toISOString() : ret.updatedAt;
		ret.appliedAt = doc.appliedAt ? doc.appliedAt.toISOString() : ret.appliedAt;
		delete ret._id;
		delete ret.__v;
		return ret;
	},
});

export default mongoose.model("HymnSuggestion", suggestionSchema);
