// server/routes/transcribeRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middlewares/authMiddleware.js"; // <-- adjust path if your file is under "../middleware/authMiddleware.js"
import { uploadAndTranscribe } from "../controllers/transcribeController.js";

const router = express.Router();

// Ensure upload dir exists (defensive)
const uploadDir = path.join(process.cwd(), "temp", "upload");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Created upload directory:", uploadDir);
  }
} catch (err) {
  console.error("Could not create upload directory:", err);
}

// Use diskStorage so we control destination + filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // sanitize originalname a bit
    const safeName = `${Date.now()}-${(file.originalname || "audio").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-\.]/g, "")}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 MB
  },
  // optionally filter file types here (we log in controller already)
  // fileFilter: (req, file, cb) => { ... }
});

// POST /api/transcribe/upload
// form-data: audio=file, meetingId=..., isFinal=true|false (optional)
router.post("/upload", protect, upload.single("audio"), uploadAndTranscribe);

export default router;
