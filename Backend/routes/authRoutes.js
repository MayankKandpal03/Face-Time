// routes/authRoutes.js
import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login`, session: false }),
  (req, res) => {
    // At this point, req.user exists from the verify callback
    const user = req.user;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Set HttpOnly cookie (recommended)
    const secure = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/", 
    });

    // Optional: also set non-HttpOnly user cookie with minimal info for UI use
    res.cookie("user", JSON.stringify({ id: user._id, name: user.name, email: user.email }), {
      httpOnly: false,
      secure,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Redirect to frontend main page (or wherever)
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5176"}/`);
  }
);

export default router;
