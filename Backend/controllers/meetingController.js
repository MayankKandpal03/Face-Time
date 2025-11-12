// Importing Models
import Meeting from '../model/meeting.js'
import Participant from '../model/participant.js'

// Logic

// Create meeting (Schedule or start now)
export const createMeeting = async (req, res)=>{
    try{
        // Extracting data for creating meeting
        const {title, hostId, scheduleAt, isScheduled} = req.body;

        // Generating random Room Code
        let roomCode = Math.random().toString(36).substring(10,16);

        // Schedule timing (If schdeule it will store the schedule time, else the current time)
        // Condition? Value_true: value_false
        const startTime = isScheduled ? new Date(scheduleAt) : new Date()

        // Creating a new meeting document 
        const meeting = await Meeting.create({
            title,                 // It is short form for title : "value"
            hostId,
            roomCode,
            scheduleAt: startTime,
            isScheduled,
            isLive:!isScheduled
        })

        // Add host as a participant
        await Participant.create({
            meetingId: meeting._id, // Storing the id of the meeting created.
            userId: hostId,
            role : "host"
        })
        // Pushing host in the meeting document inside participantsId field
        await Meeting.findByIdAndUpdate(meeting._id,{$addToSet:{participantsId: hostId}})

        // Send res status
        res.status(201).json({
            success: true,
            message: isScheduled? "Meeting scheduled sucessfully": "Meeting Started Successfully!",
            meeting
        })
    }
    catch(error){
        res.status(500).json({
            success: false,
            message: "Failed to create Meeting",
            error: error.message,
        })
    }
}

// Fetch all meeting for a host
export const getMeeting = async (req,res) =>{
    try{
        // Extract host Id
        const {hostId} = req.params
        
        // Query to fetch meeting using host id
        const meetings = await Meeting.find({hostId}).sort({createdAt: -1})

        res.status(200).json({
            success: true,
            count: meetings.length,
            meetings
        })
    }
    catch(error){
        res.status(500).json({
            success: false,
            message: "Failed to Fetch Meeting Data"
        }
    )}
}