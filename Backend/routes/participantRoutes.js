import express from "express";
import { getParticipants, leaveMeeting } from "../controllers/participantController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:meetingId", protect, getParticipants);
router.post("/leave", protect, leaveMeeting);

export default router;
