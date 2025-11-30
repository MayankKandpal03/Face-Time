// server/controllers/transcribeController.js
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import Transcript from "../model/transcript.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Config — tune these to your needs
const UPLOAD_SIZE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB per chunk (adjust)
const ACCEPTED_MIMES = ["audio/webm", "audio/wav", "audio/mpeg", "audio/ogg", "audio/x-wav", "audio/mp3"];

function normalizeProviderResponse(resp) {
  // Try common shapes returned by different SDKs
  const text = resp?.text ?? resp?.data?.[0]?.text ?? (typeof resp === "string" ? resp : "");
  const segments = resp?.segments ?? resp?.results ?? [];
  return { text, segments, raw: resp };
}

export const uploadAndTranscribe = async (req, res) => {
  // Expect: multer single file field named "audio" and meetingId in body
  const file = req.file;
  const meetingId = req.body?.meetingId;
  const isFinalFlag = req.body?.isFinal === "true" || req.body?.isFinal === true;

  if (!file) {
    return res.status(400).json({ success: false, message: "No audio file uploaded (field name 'audio')" });
  }

  if (!meetingId) {
    // cleanup and return
    try { await fsPromises.unlink(file.path); } catch (e) {}
    return res.status(400).json({ success: false, message: "meetingId is required" });
  }

  // Basic meetingId sanity check (optional: adapt if your meetingId are UUIDs/ObjectIds)
  if (typeof meetingId !== "string" || meetingId.trim().length === 0) {
    try { await fsPromises.unlink(file.path); } catch (e) {}
    return res.status(400).json({ success: false, message: "Invalid meetingId" });
  }

  // Basic file checks
  if (file.size > UPLOAD_SIZE_LIMIT_BYTES) {
    try { await fsPromises.unlink(file.path); } catch (e) {}
    return res.status(413).json({ success: false, message: "Uploaded file too large" });
  }

  const mime = file.mimetype || "";
  if (!ACCEPTED_MIMES.includes(mime)) {
    // we allow many audio types; you can tighten this if you want
    // but still attempt transcription for unknown mimetypes
    console.warn("transcribeController: unexpected mime type:", mime);
  }

  const tmpPath = path.resolve(file.path);

  try {
    // Call OpenAI (or your chosen provider)
    const stream = fs.createReadStream(tmpPath);

    // NOTE: OpenAI SDK method may vary by version. If this call fails, adapt to your SDK.
    const providerResp = await openai.audio.transcriptions.create({
      file: stream,
      model: "whisper-1"
      // consider adding language: "en", temperature: 0.0 etc.
    });

    // Normalize provider response
    const { text, segments, raw } = normalizeProviderResponse(providerResp);

    // Find existing draft transcript for this meeting (non-final), append text
    let transcript = await Transcript.findOne({ meetingId, isFinal: false }).sort({ createdAt: -1 }).exec();

    if (!transcript) {
      transcript = new Transcript({
        meetingId,
        createdBy: req.user?.id || null,
        fullText: text || "",
        segments: Array.isArray(segments) ? segments : [],
        isFinal: isFinalFlag || false,
        meta: { provider: "openai", raw }
      });
      await transcript.save();
    } else {
      transcript.fullText = (transcript.fullText ? transcript.fullText + "\n" : "") + (text || "");
      transcript.segments = transcript.segments.concat(Array.isArray(segments) ? segments : []);
      transcript.meta = { ...(transcript.meta || {}), lastProviderResp: raw, provider: "openai" };
      if (isFinalFlag) transcript.isFinal = true;
      await transcript.save();
    }

    // Emit update to room if io is available
    try {
      const io = req.app?.locals?.io;
      if (io) {
        io.to(meetingId).emit("transcript-update", {
          transcriptId: transcript._id,
          meetingId,
          text,
          fullText: transcript.fullText,
          segments: transcript.segments,
          isFinal: transcript.isFinal
        });
      } else {
        // fallback: no io present — log for debugging
        console.warn("transcribeController: req.app.locals.io is not set — cannot emit transcript-update");
      }
    } catch (e) {
      console.warn("transcribeController: emit failed", e);
    }

    return res.status(201).json({ success: true, transcript });
  } catch (err) {
    console.error("transcription error:", err);
    return res.status(500).json({ success: false, message: "Transcription failed", error: err?.message || String(err) });
  } finally {
    // cleanup temp file always
    try {
      await fsPromises.unlink(tmpPath);
    } catch (e) {
      // ignore cleanup errors
    }
  }
};
