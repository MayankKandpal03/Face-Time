import mongoose from "mongoose";

// User Schema consisting of name, email, password, role and createdAt
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password:{
        type:String,
        required: false,
        select:false
    },
    avatar: String,
    role:{
        type: String,
        enum:['host','user'],
        default: 'user'
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
})

// Model
const User = mongoose.model('User', userSchema);

// Exporting
export default User;