// server.js
import express from "express";
import http from "http";
import { fileURLToPath } from "url";
import path from "path";
import methodOverride from "method-override";
import dotenv from "dotenv";
import cors from "cors";
import { Server as IOServer } from "socket.io";
import passport from "passport";
import setupGooglePassport from "./config/passportGoogle.js";
import authRoutes from "./routes/authRoutes.js";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";               // your db.js
import { AppError } from "./utils/errorHandler.js";       // your error handler
import transcribeRoutes from "./routes/transcribeRoutes.js";

// Routes (keep these files as you already have)
import userRoutes from "./routes/userRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import participantRoutes from "./routes/participantRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";


import { socketHandler } from "./socket/socket.js";       // new: signalling + auth

dotenv.config();
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET missing. Add JWT_SECRET to your .env (do not commit it).");
  process.exit(1);
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({
  origin: true,            // tighten in production
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Serve frontend static if you put client files in /public
app.use(express.static(path.join(__dirname, "public")));

// Connect to DB
connectDB();
//cookie parser
app.use(cookieParser());
app.use(passport.initialize());
setupGooglePassport()
// API routes
app.use("/api/user", userRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/participant", participantRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/transcribe", transcribeRoutes);


// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler (fixed typo `statys`)
app.use((err, req, res, next) => {
  console.error("Error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ success: false, status, message });
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: "*", // lock this to your frontend origin in production
    methods: ["GET", "POST"]
  }
});

app.locals.io = io;
// Attach socket handler (implements JWT auth + signalling + host controls)
socketHandler(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
