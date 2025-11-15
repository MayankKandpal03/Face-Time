// Imports
import Schedule from "../models/schedule.js";
import { asyncWrap } from "../utils/errorHandler.js";

// Create Schedule
export const createSchedule = asyncWrap(async (req, res) => {
  const { meetingId, hostId, title, description, startTime, endTime, isRecurring, recurrenceRule } = req.body

  const schedule = await Schedule.create({
    meetingId,
    hostId,
    title,
    description,
    startTime,
    endTime,
    isRecurring,
    recurrenceRule
  });

  res.status(201).json({ message: "Schedule created", schedule })
});

// Get upcoming Schedules
export const getUpcomingSchedules = asyncWrap(async (req, res) => {
  const now = new Date()

  const schedules = await Schedule
    .find({ startTime: { $gte: now } })
    .sort({ startTime: 1 })

  res.status(200).json({ schedules })
});
