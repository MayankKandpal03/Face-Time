// server/controllers/meetingController.js  (or wherever you keep these functions)
import mongoose from "mongoose";
import Meeting from "../model/meeting.js";
import Participant from "../model/participant.js";
import { asyncWrap } from "../utils/errorHandler.js";

/**
 * Helper: resolve meetingId-like value to Meeting document
 * Accepts: Mongo _id strings or frontend short roomCode
 */
async function resolveMeeting(meetingIdLike) {
  if (!meetingIdLike) return null;

  // try ObjectId first
  if (mongoose.Types.ObjectId.isValid(meetingIdLike)) {
    try {
      const m = await Meeting.findById(meetingIdLike).exec();
      if (m) return m;
    } catch (e) {
      // ignore and fallback
      console.warn("resolveMeeting findById error:", e?.message);
    }
  }

  // fallback: lookup by roomCode
  try {
    const m = await Meeting.findOne({ roomCode: meetingIdLike }).exec();
    if (m) return m;
  } catch (e) {
    console.warn("resolveMeeting findOne(roomCode) error:", e?.message);
  }

  return null;
}

// Create meeting
export const createMeeting = asyncWrap(async (req, res) => {
  const { title, hostId, scheduleAt, isScheduled } = req.body;

  // Generate unique room code (6 chars) - ensure uppercase consistent with earlier code
  const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const startTime = isScheduled ? new Date(scheduleAt) : new Date();

  const meeting = await Meeting.create({
    title,
    hostId,
    roomCode,
    scheduleAt: startTime,
    isScheduled,
    isLive: !isScheduled,
  });

  // Add host to Participants collection
  await Participant.create({
    meetingId: meeting._id.toString(),
    userId: hostId,
    role: "host",
    socketId: null,
  });

  // Add host as participant in Meetings collection (store user id)
  await Meeting.findByIdAndUpdate(meeting._id, { $addToSet: { participantsId: hostId } }).exec();

  res.status(201).json({
    success: true,
    message: isScheduled ? "Meeting scheduled successfully" : "Meeting started successfully",
    meeting,
  });
});

// Join Meeting
export const joinMeeting = asyncWrap(async (req, res) => {
  const { meetingId: rawMeetingId, userId } = req.body;

  // Resolve canonical meeting doc
  const meeting = await resolveMeeting(rawMeetingId);
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });

  const meetingDbId = meeting._id.toString();

  // Check if user already exists
  const existing = await Participant.findOne({ meetingId: meetingDbId, userId }).exec();
  if (existing) {
    return res.status(400).json({ message: "Already joined" });
  }

  // Add user to Participants collection and add userId to meeting collections
  const participant = await Participant.create({ meetingId: meetingDbId, userId });
  await Meeting.findByIdAndUpdate(meetingDbId, { $addToSet: { participantsId: userId } }).exec();

  res.status(200).json({ message: "Joined meeting", participant });
});

// End meeting
export const endMeeting = asyncWrap(async (req, res) => {
  const { meetingId: rawMeetingId } = req.body;

  const meeting = await resolveMeeting(rawMeetingId);
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });

  const meetingDbId = meeting._id.toString();

  await Meeting.findByIdAndUpdate(meetingDbId, { isLive: false }).exec();
  res.status(200).json({ message: "Meeting ended" });
});

// Get all meetings for a host
export const getMeeting = asyncWrap(async (req, res) => {
  const { hostId } = req.params;
  const meetings = await Meeting.find({ hostId }).sort({ createdAt: -1 }).exec();
  res.status(200).json({ success: true, count: meetings.length, meetings });
});
