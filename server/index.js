import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import songRoutes from "./routes/songs.js";
import hymnRoutes from "./routes/hymns.js";
import uploadRoutes from "./routes/upload.js";
import youtubeLinksRoutes from "./routes/youtubeLinks.js";
import authRoutes, { seedAdminUser } from "./routes/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectToMongo } from "./db/mongo.js";

// Load .env file - try multiple possible paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Try multiple possible paths for .env file
const possiblePaths = [
	join(__dirname, ".env"), // In server directory (most likely)
	join(__dirname, "..", ".env"), // In project root
	join(process.cwd(), ".env"), // From current working directory
	join(process.cwd(), "..", ".env"), // One level up from cwd
];
let envPath = null;
let result = { error: null };

for (const path of possiblePaths) {
	result = dotenv.config({ path });
	if (!result.error) {
		envPath = path;
		break;
	}
}

if (result.error || !envPath) {
	console.warn("⚠️  Warning: Could not load .env file");
	console.warn("Tried paths:", possiblePaths);
	if (result.error) {
		console.warn("Error:", result.error.message);
	}
} else {
	console.log("✅ .env file loaded successfully");
	console.log("📍 Env file path:", envPath);
	console.log(
		"🔑 IMAGEKIT_PUBLIC_KEY:",
		process.env.IMAGEKIT_PUBLIC_KEY ? "✅ Set" : "❌ Not set"
	);
	console.log(
		"🔑 IMAGEKIT_PRIVATE_KEY:",
		process.env.IMAGEKIT_PRIVATE_KEY ? "✅ Set" : "❌ Not set"
	);
	console.log(
		"🔑 IMAGEKIT_URL_ENDPOINT:",
		process.env.IMAGEKIT_URL_ENDPOINT ? "✅ Set" : "❌ Not set"
	);
	console.log(
		"🔑 MONGODB_URI:",
		process.env.MONGODB_URI || process.env.MONGO_URI ? "✅ Set (YouTube links will persist)" : "❌ Not set (using JSON file)"
	);
}

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
		crossOriginOpenerPolicy: { policy: "unsafe-none" },
	})
);

// CORS configuration - Allow all origins
app.use(
	cors({
		origin: true, // This will reflect the request origin
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"Accept",
			"Origin",
			"X-Requested-With",
			"X-Platform",
			"X-App-Version",
		],
		exposedHeaders: [
			"Content-Length",
			"Content-Type",
			"X-Platform",
			"X-App-Version",
		],
		credentials: true,
		preflightContinue: false,
		optionsSuccessStatus: 204,
		maxAge: 86400, // 24 hours
	})
);

// Handle OPTIONS requests
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB if MONGODB_URI is set (for production / persistent YouTube links)
connectToMongo()
	.then(() => seedAdminUser())
	.catch((err) => console.error("Mongo connect error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api", hymnRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", youtubeLinksRoutes);

// Health check
app.get("/api/health", (req, res) => {
	res.json({ status: "OK", message: "Music Database API is running" });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
	res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
	console.log(`🎵 Music Database API running on port ${PORT}`);
});
