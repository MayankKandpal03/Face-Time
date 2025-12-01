// Backend/controllers/transcribeController.js
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import Transcript from "../model/transcript.js";
// NOTE: we no longer import OpenAI here
import transcribeQueue from "./transcribeQueue.js"; // the queue module we added

// Config — tune these to your needs
const UPLOAD_SIZE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB per chunk (adjust)
const ACCEPTED_MIMES = ["audio/webm", "audio/wav", "audio/mpeg", "audio/ogg", "audio/x-wav", "audio/mp3"];

export const uploadAndTranscribe = async (req, res) => {
  const file = req.file;
  const meetingId = req.body?.meetingId;
  const isFinalFlag = req.body?.isFinal === "true" || req.body?.isFinal === true;

  if (!file) {
    return res.status(400).json({ success: false, message: "No audio file uploaded (field name 'audio')" });
  }

  if (!meetingId) {
    try { await fsPromises.unlink(file.path); } catch (e) {}
    return res.status(400).json({ success: false, message: "meetingId is required" });
  }

  if (typeof meetingId !== "string" || meetingId.trim().length === 0) {
    try { await fsPromises.unlink(file.path); } catch (e) {}
    return res.status(400).json({ success: false, message: "Invalid meetingId" });
  }

  if (file.size > UPLOAD_SIZE_LIMIT_BYTES) {
    try { await fsPromises.unlink(file.path); } catch (e) {}
    return res.status(413).json({ success: false, message: "Uploaded file too large" });
  }

  const mime = file.mimetype || "";
  if (!ACCEPTED_MIMES.includes(mime)) {
    console.warn("transcribeController: unexpected mime type:", mime);
  }

  // Move the multer temporary file to a stable temp path (optional, but safer)
  const tmpDir = path.join(process.cwd(), "temp", "transcribe");
  try {
    await fsPromises.mkdir(tmpDir, { recursive: true });
  } catch (e) { /* ignore */ }

  const tmpFilename = `transcribe_${Date.now()}_${path.basename(file.path)}`;
  const tmpPath = path.join(tmpDir, tmpFilename);

  try {
    // move file to tmpPath
    await fsPromises.rename(file.path, tmpPath);
  } catch (e) {
    // if rename fails, fallback to copy then unlink original
    try {
      await fsPromises.copyFile(file.path, tmpPath);
      await fsPromises.unlink(file.path);
    } catch (copyErr) {
      // cleanup and return error
      try { await fsPromises.unlink(file.path); } catch (ee) {}
      console.error("transcribeController: failed to move uploaded file", copyErr);
      return res.status(500).json({ success: false, message: "Failed to process uploaded file" });
    }
  }

  // Enqueue job for background processing.
  try {
    // pass req.app so queue can access app.locals.io
    await transcribeQueue.enqueue({
      tmpPath,
      meetingId,
      userId: req.user?.id || null,
      isFinal: !!isFinalFlag,
      app: req.app
    });

    // Return 202 Accepted — server will emit transcript via socket when ready
    return res.status(202).json({ success: true, message: "Transcription job accepted", tmpPath });
  } catch (err) {
    console.error("transcribeController: enqueue failed", err);
    // cleanup tmp file
    try { await fsPromises.unlink(tmpPath); } catch (e) {}
    return res.status(500).json({ success: false, message: "Failed to enqueue transcription job" });
  }
};
