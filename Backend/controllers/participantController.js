// Imports
import Participant from "../model/participant.js";
import { asyncWrap } from "../utils/errorHandler.js";

// Get participants for a meeting (populates user name, email and role)
export const getParticipants = asyncWrap(async (req, res) => {
  const { meetingId } = req.params;

  // Extract all participants using meeting id and populte userId (name, email and role)
  const participants = await Participant.find({ meetingId }).populate("userId", "name email role");
  res.status(200).json({ success: true, count: participants.length, participants });
});

// Leave meeting (mark leftAt)
export const leaveMeeting = asyncWrap(async (req, res) => {
  const { meetingId, userId } = req.body;
  await Participant.findOneAndUpdate({ meetingId, userId }, { leftAt: new Date(), socketId: null });
  res.status(200).json({ success: true, message: "Left meeting" });
});
