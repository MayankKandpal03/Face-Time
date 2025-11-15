// Imports
import Message from "../models/message.js";
import { asyncWrap } from "../utils/asyncWrap.js";

// Send message
export const sendMessage = asyncWrap(async (req, res) => {
  const { senderId, meetingId, content, type, receiverId, isBroadcast } = req.body;

  const message = await Message.create({
    senderId,
    meetingId,
    content,
    type,
    receiverId: isBroadcast ? null : receiverId || null    // null for everyone
  });

  res.status(201).json({ message });
});


// Get all message
export const getMessages = asyncWrap(async (req, res) => {
    const { meetingId } = req.params;

    const messages = await Message
        .find({ meetingId })
        .sort({ createdAt: 1 });

    res.status(200).json({ messages });
});
