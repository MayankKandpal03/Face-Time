// Imports
import Meeting from "../models/meeting.js";
import Participant from "../models/participant.js";
import { asyncWrap } from "../utils/errorHandler.js"; 

// Logic

// Create meeting
export const createMeeting = asyncWrap(async (req, res) => {
  // Extract data from url
  const { title, hostId, scheduleAt, isScheduled } = req.body;

  // Generate unique room code (6 chars)
  const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  // Check if the meeting is schedule or not
  const startTime = isScheduled ? new Date(scheduleAt) : new Date();

  // Create meeting Document
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
    meetingId: meeting._id,
    userId: hostId,
    role: "host",
  });

  // Add host as participant in Meetings collection
  await Meeting.findByIdAndUpdate(meeting._id, { $addToSet: { participantsId: hostId } });

  res.status(201).json({
    success: true,
    message: isScheduled ? "Meeting scheduled successfully" : "Meeting started successfully",
    meeting,
  });
});


// Join Meeting
export const joinMeeting = asyncWrap(async (req, res) => {
  // Extract data from url
  const { meetingId, userId } = req.body;

  // Check if the user already exist
  const existing = await Participant.findOne({ meetingId, userId });
  if (existing) {
    return res.status(400).json({ message: "Already joined" });
  }

  // Add user to Participants collection and add uesrId to meeting collections
  const participant = await Participant.create({ meetingId, userId });
  await Meeting.findByIdAndUpdate(meetingId, { $addToSet: { participantsId: userId } });

  res.status(200).json({ message: "Joined meeting", participant });
});


// End meeting
export const endMeeting = asyncWrap(async (req, res) => {
  // Extract data from ur
  const { meetingId } = req.body;

  // Change is live field
  await Meeting.findByIdAndUpdate(meetingId, { isLive: false });
  res.status(200).json({ message: "Meeting ended" });
});


// Get all meeting
export const getMeeting = asyncWrap(async (req, res) => {
  const { hostId } = req.params;
  const meetings = await Meeting.find({ hostId }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: meetings.length, meetings });
});
