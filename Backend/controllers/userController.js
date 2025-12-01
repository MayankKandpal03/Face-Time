// Import
import User from "../model/user.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { asyncWrap } from "../utils/errorHandler.js"

// Logic
// Register
const sanitizeUser = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.password;
  return obj;
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    const emailNormalized = String(email || "").toLowerCase().trim();

    if (!name || !emailNormalized || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email: emailNormalized });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const created = await User.create({ name: name.trim(), email: emailNormalized, password: hashed });

    // sign token
    const token = jwt.sign({ id: created._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ message: "User registered", user: sanitizeUser(created), token });
  } catch (err) {
    next(err);
  }
};

// Login
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const emailNormalized = String(email || "").toLowerCase().trim();

    if (!emailNormalized || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // IMPORTANT: select the password explicitly if your schema has select:false
    const user = await User.findOne({ email: emailNormalized }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // user.password is the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const sanitized = sanitizeUser(user);
    res.status(200).json({ message: "Login successful", user: sanitized, token });
  } catch (err) {
    next(err);
  }
};


// Get profile
export const getProfile = asyncWrap(async (req, res) => {
   const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ user });
})
