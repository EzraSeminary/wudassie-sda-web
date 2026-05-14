import express from "express";
import multer from "multer";
import sharp from "sharp";
import ImageKit from "imagekit";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Test endpoint to verify route is working
router.get("/test", (req, res) => {
	res.json({
		message: "Upload route is working",
		envCheck: {
			publicKey: process.env.IMAGEKIT_PUBLIC_KEY ? "✅ Set" : "❌ Not set",
			privateKey: process.env.IMAGEKIT_PRIVATE_KEY ? "✅ Set" : "❌ Not set",
			urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT ? "✅ Set" : "❌ Not set",
		},
	});
});

// Lazy initialization of ImageKit (only when needed)
let imagekit = null;

const getImageKit = () => {
	if (!imagekit) {
		const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
		const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
		const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

		if (!publicKey || !privateKey || !urlEndpoint) {
			throw new Error(
				"ImageKit not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables"
			);
		}

		imagekit = new ImageKit({
			publicKey,
			privateKey,
			urlEndpoint,
		});
	}
	return imagekit;
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
	fileFilter: (req, file, cb) => {
		// Allow images and audio files
		if (
			file.mimetype.startsWith("image/") ||
			file.mimetype.startsWith("audio/")
		) {
			cb(null, true);
		} else {
			cb(new Error("Only image and audio files are allowed"), false);
		}
	},
});

// Upload image endpoint (with optimization)
router.post("/image", requireAuth, upload.single("image"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No image file provided" });
		}

		// Get ImageKit instance (will throw if not configured)
		const imagekitInstance = getImageKit();

		// Optimize image using sharp
		let optimizedImage;
		if (req.file.mimetype === "image/png") {
			optimizedImage = await sharp(req.file.buffer)
				.resize(2000, 2000, {
					fit: "inside",
					withoutEnlargement: true,
				})
				.png({ quality: 85, compressionLevel: 9 })
				.toBuffer();
		} else {
			optimizedImage = await sharp(req.file.buffer)
				.resize(2000, 2000, {
					fit: "inside",
					withoutEnlargement: true,
				})
				.jpeg({ quality: 85 })
				.toBuffer();
		}

		// Upload to ImageKit
		const fileExtension = req.file.mimetype === "image/png" ? "png" : "jpg";
		const uploadResponse = await imagekitInstance.upload({
			file: optimizedImage,
			fileName: `${uuidv4()}.${fileExtension}`,
			folder: "/hymns/sheet-music/",
		});

		res.json({
			url: uploadResponse.url,
			fileId: uploadResponse.fileId,
		});
	} catch (error) {
		console.error("Error uploading image:", error);
		res.status(500).json({ error: "Failed to upload image" });
	}
});

// Upload multiple images endpoint
router.post("/images", requireAuth, upload.array("images", 3), async (req, res) => {
	try {
		if (!req.files || req.files.length === 0) {
			return res.status(400).json({ error: "No image files provided" });
		}

		// Get ImageKit instance (will throw if not configured)
		const imagekitInstance = getImageKit();

		const uploadPromises = req.files.map(async (file) => {
			// Optimize image using sharp
			let optimizedImage;
			if (file.mimetype === "image/png") {
				optimizedImage = await sharp(file.buffer)
					.resize(2000, 2000, {
						fit: "inside",
						withoutEnlargement: true,
					})
					.png({ quality: 85, compressionLevel: 9 })
					.toBuffer();
			} else {
				optimizedImage = await sharp(file.buffer)
					.resize(2000, 2000, {
						fit: "inside",
						withoutEnlargement: true,
					})
					.jpeg({ quality: 85 })
					.toBuffer();
			}

			// Upload to ImageKit
			const fileExtension = file.mimetype === "image/png" ? "png" : "jpg";
			return imagekitInstance.upload({
				file: optimizedImage,
				fileName: `${uuidv4()}.${fileExtension}`,
				folder: "/hymns/sheet-music/",
			});
		});

		const uploadResponses = await Promise.all(uploadPromises);

		res.json({
			urls: uploadResponses.map((response) => response.url),
			fileIds: uploadResponses.map((response) => response.fileId),
		});
	} catch (error) {
		console.error("Error uploading images:", error);
		const statusCode = error.message.includes("not configured") ? 500 : 500;
		res.status(statusCode).json({
			error: "Failed to upload images",
			details: error.message,
		});
	}
});

// Upload audio endpoint
router.post("/audio", requireAuth, upload.single("audio"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No audio file provided" });
		}

		// Get ImageKit instance (will throw if not configured)
		const imagekitInstance = getImageKit();

		// Upload to ImageKit (ImageKit supports audio files)
		const uploadResponse = await imagekitInstance.upload({
			file: req.file.buffer,
			fileName: `${uuidv4()}.${req.file.originalname.split(".").pop()}`,
			folder: "/hymns/audio/",
		});

		res.json({
			url: uploadResponse.url,
			fileId: uploadResponse.fileId,
		});
	} catch (error) {
		console.error("Error uploading audio:", error);
		const statusCode = error.message.includes("not configured") ? 500 : 500;
		res.status(statusCode).json({
			error: "Failed to upload audio",
			details: error.message,
		});
	}
});

export default router;
