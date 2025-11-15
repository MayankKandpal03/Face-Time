import express from "express";
import {
  createSchedule,
  getUpcomingSchedules
} from "../controllers/scheduleController.js";

const router = express.Router();

router.post("/create", createSchedule);
router.get("/upcoming", getUpcomingSchedules);

export default router;
