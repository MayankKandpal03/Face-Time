// Backend/controllers/transcribeQueue.js
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import OpenAI from "openai";
import Transcript from "../model/transcript.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory FIFO queue with single worker.
// Jobs: { tmpPath, meetingId, userId, isFinal, ctx } where ctx is optional metadata
class TranscribeQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 2;
  }

  // enqueue a job
  async enqueue(job) {
    this.queue.push(job);
    this._maybeProcess();
    return { enqueued: true, queueLength: this.queue.length };
  }

  // start processing if not already
  async _maybeProcess() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        await this._processJob(job);
      } catch (err) {
        console.error("transcribeQueue: job failed", err);
        // continue to next job
      }
    }

    this.processing = false;
  }

  // actual job processing: call OpenAI, persist Transcript, emit socket.io events
  async _processJob({ tmpPath, meetingId, userId, isFinal = false, app }) {
    // app should be provided so we can use app.locals.io
    const io = app?.locals?.io;
    // small helper to call provider with retries
    const callProvider = async () => {
      let attempt = 0;
      while (true) {
        // create fresh stream for each attempt
        let stream;
        try {
          stream = fs.createReadStream(tmpPath);
        } catch (err) {
          throw err;
        }

        try {
          const providerResp = await openai.audio.transcriptions.create({
            file: stream,
            model: "whisper-1"
          });
          return providerResp;
        } catch (err) {
          const status = err?.status || err?.statusCode || null;
          const retryable = status === 429 || (status >= 500 && status < 600);
          try { stream.destroy && stream.destroy(); } catch (e) {}
          if (retryable && attempt < this.maxRetries) {
            const backoff = 500 * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, backoff));
            attempt++;
            continue;
          }
          const wrapped = new Error(err?.message || "provider error");
          wrapped._orig = err;
          wrapped.status = status;
          throw wrapped;
        }
      }
    };

    try {
      const providerResp = await callProvider();
      const text = providerResp?.text ?? providerResp?.data?.[0]?.text ?? "";
      const segments = providerResp?.segments ?? providerResp?.results ?? [];

      // append or create transcript in DB
      let transcript = await Transcript.findOne({ meetingId, isFinal: false }).sort({ createdAt: -1 }).exec();
      if (!transcript) {
        transcript = new Transcript({
          meetingId,
          createdBy: userId || null,
          fullText: text || "",
          segments: Array.isArray(segments) ? segments : [],
          isFinal: !!isFinal,
          meta: { providerResp: providerResp }
        });
        await transcript.save();
      } else {
        transcript.fullText = (transcript.fullText ? transcript.fullText + "\n" : "") + (text || "");
        transcript.segments = transcript.segments.concat(Array.isArray(segments) ? segments : []);
        if (isFinal) transcript.isFinal = true;
        transcript.meta = { ...(transcript.meta || {}), lastProviderResp: providerResp };
        await transcript.save();
      }

      // emit via socket.io if available
      try {
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
          console.warn("transcribeQueue: io not available, cannot emit transcript-update");
        }
      } catch (e) {
        console.warn("transcribeQueue: emit failed", e);
      }
    } finally {
      // always cleanup temp file
      try { await fsPromises.unlink(tmpPath); } catch (e) {}
    }
  }
}

const singleton = new TranscribeQueue();
export default singleton;
