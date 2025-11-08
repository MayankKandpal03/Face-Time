// Importing mongoose
import mongoose from "mongoose";

// Creating Participant Schema
// Consisting of meetingId, userId, joinedAt, leftAt, isMuted, isVideoOn, role, and socketId
const participantSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Meeting',
        required:true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: {
        type: Date,
    },
    isMuted: {
        type: Boolean,
        default: false
    },
    isVideoOn: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['host', 'participant'],
        default: 'participant'
    },
    socketId: String,
})

participantSchema.index({meetingId:1, userId:1}, {unique: true}) // Ensures each user can join only once per meeting.

// Model
const Participant = mongoose.model('Participant',participantSchema);

export default  Participant;