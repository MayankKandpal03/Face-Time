import mongoose from "mongoose";

// Schema consisting of senderId, meetingId, receiverId, content, type, createdAt
const messageSchema = mongoose.Schema({
    senderId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    meetingId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Meeting',
        required: true
    },
    receiverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    content:{
        type: String,
        required: true
    },
    type:{
        type:String,
        enum:['text','file','image'],
        default:'text'
    },
    fileUrl: String, // For file/image
    createdAt:{
        type: Date,
        default: Date.now
    }
})

messageSchema.index({meetingId:1, createdAt:-1})

// Model
const Message = mongoose.model('Message',messageSchema)

export default Message;