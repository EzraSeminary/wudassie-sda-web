import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isMongoConnected } from "../db/mongo.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "wudassie-hymnal-super-secret-jwt-key-2024";
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin1234";

const signToken = (user) =>
	jwt.sign({ id: user._id || "admin", email: user.email, role: user.role || "admin" }, JWT_SECRET, {
		expiresIn: "7d",
	});

export const seedAdminUser = async () => {
	if (!isMongoConnected()) return;
	try {
		const existing = await User.findOne({ email: ADMIN_EMAIL });
		if (!existing) {
			await User.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" });
			console.log("✅ Admin user created:", ADMIN_EMAIL);
		}
	} catch (err) {
		console.error("Error seeding admin user:", err.message);
	}
};

router.post("/login", async (req, res) => {
	const { email, password } = req.body || {};
	if (!email || !password) {
		return res.status(400).json({ error: "Email and password are required" });
	}

	try {
		if (isMongoConnected()) {
			const user = await User.findOne({ email: String(email).toLowerCase().trim() });
			if (!user) return res.status(401).json({ error: "Invalid credentials" });
			const valid = await user.comparePassword(password);
			if (!valid) return res.status(401).json({ error: "Invalid credentials" });
			const token = signToken(user);
			return res.json({ token, user: { email: user.email, role: user.role } });
		}

		// Fallback when MongoDB is not connected — check against hardcoded admin credentials
		const emailMatch = String(email).toLowerCase().trim() === ADMIN_EMAIL;
		const passMatch = password === ADMIN_PASSWORD;
		if (!emailMatch || !passMatch) {
			return res.status(401).json({ error: "Invalid credentials" });
		}
		const token = jwt.sign({ id: "admin", email: ADMIN_EMAIL, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
		return res.json({ token, user: { email: ADMIN_EMAIL, role: "admin" } });
	} catch (err) {
		console.error("Login error:", err);
		res.status(500).json({ error: "Login failed" });
	}
});

router.get("/me", (req, res) => {
	const header = req.headers.authorization;
	if (!header || !header.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Not authenticated" });
	}
	try {
		const payload = jwt.verify(header.slice(7), JWT_SECRET);
		res.json({ user: { email: payload.email, role: payload.role } });
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
});

router.get("/users", requireAdmin, async (req, res) => {
	if (!isMongoConnected()) {
		return res.status(503).json({ error: "User management requires MongoDB" });
	}

	try {
		const users = await User.find().sort({ role: 1, createdAt: -1 }).lean();
		res.json(
			users.map((user) => ({
				id: String(user._id),
				name: user.name || "",
				email: user.email,
				role: user.role,
				createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
				updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
			}))
		);
	} catch (err) {
		console.error("List users error:", err);
		res.status(500).json({ error: "Failed to load users" });
	}
});

router.post("/users", requireAdmin, async (req, res) => {
	if (!isMongoConnected()) {
		return res.status(503).json({ error: "User management requires MongoDB" });
	}

	const email = String(req.body?.email || "").toLowerCase().trim();
	const password = String(req.body?.password || "");
	const name = String(req.body?.name || "").trim();
	const role = String(req.body?.role || "encoder").trim();

	if (!email || !password) {
		return res.status(400).json({ error: "Email and password are required" });
	}
	if (password.length < 8) {
		return res.status(400).json({ error: "Password must be at least 8 characters" });
	}
	if (!["encoder"].includes(role)) {
		return res.status(400).json({ error: "Only encoder accounts can be created here" });
	}

	try {
		const existing = await User.findOne({ email });
		if (existing) {
			return res.status(409).json({ error: "A user with that email already exists" });
		}

		const user = await User.create({ email, password, name, role });
		res.status(201).json({
			id: String(user._id),
			name: user.name || "",
			email: user.email,
			role: user.role,
			createdAt: user.createdAt ? user.createdAt.toISOString() : null,
			updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
		});
	} catch (err) {
		console.error("Create user error:", err);
		res.status(500).json({ error: "Failed to create user" });
	}
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
	if (!isMongoConnected()) {
		return res.status(503).json({ error: "User management requires MongoDB" });
	}

	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		if (user.role === "admin") {
			return res.status(400).json({ error: "Admin accounts cannot be deleted here" });
		}
		if (String(user._id) === req.user.id) {
			return res.status(400).json({ error: "You cannot delete your own account" });
		}

		await User.deleteOne({ _id: user._id });
		res.status(204).send();
	} catch (err) {
		console.error("Delete user error:", err);
		res.status(500).json({ error: "Failed to delete user" });
	}
});

export default router;
