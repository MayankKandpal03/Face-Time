import mongoose from "mongoose";

// Schedule Schema
// Used to plan future or recurring meetings
const scheduleSchema = new mongoose.Schema({
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Meeting",
    required: true,
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurrenceRule: {
    type: String, // e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"
  },
  reminderBefore: {
    type: Number, // in minutes
    default: 15,  // e.g., reminder 15 min before meeting
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for quick upcoming schedule lookups
scheduleSchema.index({ startTime: 1 });

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;
