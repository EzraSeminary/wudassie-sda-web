import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { isMongoConnected } from "../db/mongo.js";

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

export default router;
