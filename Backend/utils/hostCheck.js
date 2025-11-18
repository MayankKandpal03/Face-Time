import Meeting from "../model/meeting.js";

export const hostCheck = async (socket, meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) return false;
  return meeting.hostId.toString() === socket.userId.toString();
};
