// Importing mongoose
import mongoose from "mongoose";

// Creating Room Schema
// Consisting of title, hostId, participantsId, isLive, createdAt, scheduleAt, schedule, and roomCode
const meetingSchema = new mongoose.Schema({
    title: String,
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    participantsId:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    }],
    scheduleAt: Date,
    schedule: {                  
        rrule: String,            
        endDate: Date
    },
    isLive: {
        type: Boolean,
        default: false
    },
    roomCode:{
        type:String,
        unique: true,
        index: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
    duration:{  
        type: Date
    }
});

// Creating Model 
const Meeting = mongoose.model('Meeting',meetingSchema);

export default Meeting;