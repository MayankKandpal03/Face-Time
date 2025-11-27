// Import
import User from "../model/user.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { asyncWrap } from "../utils/errorHandler.js"

// Logic
// Register
export const registerUser = asyncWrap(async (req, res) => { 
  const { name, email, password } = req.body
  
  
  const existing = await User.findOne({ email })
  if (existing) return res.status(400).json({ message: "Email is already registered" })

  const hashed = await bcrypt.hash(password, 10)

  const user = await User.create({ name, email, password: hashed })
  const jwtSecret = process.env.JWT_SECRET || "dev_fallback_secret";

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

  res.status(201).json({ message: "User registered", user, token })
})

// Login
export const loginUser = async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) return res.status(400).json({ message: "Email and Password Required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user._id);
    return res.json({ message: "Logged in", token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
};


// Get profile
export const getProfile = asyncWrap(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password")
  res.status(200).json({ user })
})
