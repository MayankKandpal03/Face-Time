// server/model/transcript.js
import mongoose from "mongoose";

const segmentSchema = new mongoose.Schema({
  text: { type: String },
  start: { type: Number }, // seconds (optional)
  end: { type: Number },   // seconds (optional)
  speaker: { type: String }, // optional speaker id/name
});

const transcriptSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  fullText: { type: String, default: "" },
  segments: [segmentSchema],
  isFinal: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed, default: {}}, // provider response or diagnostics
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

transcriptSchema.pre("save", function(next){
  this.updatedAt = new Date();
  next();
});

const Transcript = mongoose.model("Transcript", transcriptSchema);
export default Transcript;
