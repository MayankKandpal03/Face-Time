// server/routes/transcribeRoutes.js
import express from "express";
import multer from "multer";
import { protect } from "../middlewares/authMiddleware.js";
import { uploadAndTranscribe } from "../controllers/transcribeController.js";

const router = express.Router();

// MULTER CONFIG — ADD LIMITS HERE
const upload = multer({
  dest: "tmp/uploads/",
  limits: {
    fileSize: 12 * 1024 * 1024, // 12MB max per audio chunk
  },
});

// POST /api/transcribe/upload
// form-data: audio=file, meetingId=...
router.post("/upload", protect, upload.single("audio"), uploadAndTranscribe);

export default router;
