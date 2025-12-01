// authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../model/user.js";

/**
 * Protect middleware
 * Accepts token from:
 *  - Authorization: Bearer <token>
 *  - req.cookies.token (requires cookie-parser middleware)
 *
 * On success: sets req.user to the user document (without password).
 * On failure: responds with 401 and a helpful message.
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // 1) Authorization header (Bearer)
    const authHeader = req.headers?.authorization;
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2) Fallback: cookie (if cookie-parser is enabled)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 3) Fallback: query param (optional; remove if you don't want it)
    // if (!token && req.query && req.query.token) {
    //   token = req.query.token;
    // }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    // verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyErr) {
      // Differentiate expired vs invalid for easier debugging
      if (verifyErr.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Token invalid" });
    }

    // Attach user (without password) to req
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    // helpful shape for downstream code
    req.user = user;           // full user doc (no password)
    req.userId = user._id;     // convenience id access

    return next();
  } catch (err) {
    console.error("Protect middleware error:", err);
    return res.status(401).json({ message: "Not authorized" });
  }
};
