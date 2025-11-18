// socket/socket.js
import jwt from "jsonwebtoken";
import Meeting from "../model/meeting.js";
import Participant from "../model/participant.js";
import { hostCheck } from "../utils/hostCheck.js";

/**
 * io: Socket.IO server instance
 *
 * Protocol:
 * - Client connects with: io({ auth: { token: "<JWT>" } })
 * - Client emits 'join-room' { meetingId }
 * - Server verifies JWT, joins socket to room, saves socketId to Participant,
 *   emits existing members to joining client, and notifies others.
 */
export const socketHandler = (io) => {
  // Socket auth middleware: require valid JWT
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized: No token provided"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      return next(new Error("Unauthorized: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id, "user:", socket.userId);

    // Join a meeting room (client emits { meetingId })
    socket.on("join-room", async ({ meetingId }) => {
      // Optional: verify meeting exists and user is participant/allowed
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        socket.emit("error", { message: "Meeting not found" });
        return;
      }

      // join socket.io room
      socket.join(meetingId);
      socket.meetingId = meetingId;

      // Save or update Participant socketId (so host can target them)
      try {
        await Participant.findOneAndUpdate(
          { meetingId, userId: socket.userId },
          { $set: { socketId: socket.id, joinedAt: new Date(), leftAt: null } },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error("Participant update error:", err.message);
      }

      // Inform the joining client about other sockets in the room
      const clients = Array.from(io.sockets.adapter.rooms.get(meetingId) || []);
      const otherClients = clients.filter(id => id !== socket.id);
      socket.emit("all-users", { users: otherClients });

      // Notify others a user joined (send socket id and user id)
      socket.to(meetingId).emit("user-joined", { socketId: socket.id, userId: socket.userId });
    });

    // Offer -> target socket
    socket.on("offer", ({ target, sdp }) => {
      io.to(target).emit("offer", { sdp, caller: socket.id });
    });

    // Answer -> target socket
    socket.on("answer", ({ target, sdp }) => {
      io.to(target).emit("answer", { sdp, responder: socket.id });
    });

    // ICE -> target socket
    socket.on("ice-candidate", ({ target, candidate }) => {
      io.to(target).emit("ice-candidate", { candidate, from: socket.id });
    });

    // Host-only: mute a participant (checks host)
    socket.on("mute-user", async ({ meetingId, target }) => {
      try {
        const ok = await hostCheck(socket, meetingId);
        if (!ok) return socket.emit("error", { message: "Not authorized" });
        // update DB state
        await Participant.findOneAndUpdate({ meetingId, socketId: target }, { $set: { isMuted: true }});
        // inform target socket
        io.to(target).emit("force-mute");
      } catch (err) {
        console.error("mute-user error:", err.message);
      }
    });

    // Host-only: remove a participant
    socket.on("remove-user", async ({ meetingId, target }) => {
      try {
        const ok = await hostCheck(socket, meetingId);
        if (!ok) return socket.emit("error", { message: "Not authorized" });
        // delete participant document or mark leftAt
        await Participant.findOneAndUpdate({ meetingId, socketId: target }, { $set: { leftAt: new Date() }});
        // notify target to disconnect
        io.to(target).emit("removed-from-meeting");
        // notify others
        socket.to(meetingId).emit("user-removed", { socketId: target });
      } catch (err) {
        console.error("remove-user error:", err.message);
      }
    });

    // Host-only: lock/unlock room
    socket.on("lock-room", async ({ meetingId, lock }) => {
      try {
        const ok = await hostCheck(socket, meetingId);
        if (!ok) return socket.emit("error", { message: "Not authorized" });
        await Meeting.findByIdAndUpdate(meetingId, { isLocked: !!lock });
        io.to(meetingId).emit("room-locked", { locked: !!lock });
      } catch (err) {
        console.error("lock-room error:", err.message);
      }
    });
    
    socket.on("send-group-message", ({ meetingId, message }) => {
      socket.to(meetingId).emit("receive-group-message", message);
    });

    // Leave room gracefully
    socket.on("leave-room", async ({ meetingId }) => {
      socket.leave(meetingId);
      try {
        await Participant.findOneAndUpdate({ meetingId, socketId: socket.id }, { $set: { leftAt: new Date(), socketId: null }});
      } catch (err) { /* ignore */ }
      socket.to(meetingId).emit("user-left", { socketId: socket.id, userId: socket.userId });
    });

    // Disconnect (socket closed)
    socket.on("disconnect", async () => {
      const meetingId = socket.meetingId;
      if (meetingId) {
        try {
          await Participant.findOneAndUpdate({ meetingId, socketId: socket.id }, { $set: { leftAt: new Date(), socketId: null }});
        } catch (err) { /* ignore */ }
        socket.to(meetingId).emit("user-left", { socketId: socket.id, userId: socket.userId });
      }
      console.log("Disconnected:", socket.id);
    });
  });
};
