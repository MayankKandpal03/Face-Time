// Import
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createMeeting,
  joinMeeting,
  endMeeting,
  getMeeting,
} from "../controllers/meetingController.js";

const router = express.Router();

router.post("/create", protect, createMeeting);
router.post("/join", protect, joinMeeting);
router.post("/end", protect, endMeeting);
router.get("/:hostId", protect, getMeeting);

export default router;