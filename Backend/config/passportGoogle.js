// config/passportGoogle.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../model/user.js";

export default function setupGooglePassport() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

  // Basic env validation to fail fast and provide a clear message
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    console.error(
      "Google OAuth configuration missing. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL in your .env"
    );
    // Do not throw here — allow server to start but Passport won't be functional.
    // If you prefer to exit process, uncomment the next line:
    // process.exit(1);
  }

  // Helpful debug info (does NOT log secrets)
  console.log("Using Google callbackURL:", GOOGLE_CALLBACK_URL || "<not set>");
  console.log("Using Google clientID:", process.env.GOOGLE_CLIENT_ID);

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      // verify callback
      async (accessToken, refreshToken, profile, done) => {
        try {
          // profile may or may not contain emails (depends on scopes & user privacy)
          const email = Array.isArray(profile.emails) && profile.emails.length > 0
            ? profile.emails[0].value
            : null;

          const name =
            profile.displayName ||
            (profile.name && (profile.name.givenName || profile.name.familyName)) ||
            "Google User";

          const googleId = profile.id;

          // Try to find the user by googleId first
          let user = null;
          if (googleId) {
            user = await User.findOne({ googleId }).select("-password");
          }

          // If not found by googleId, try by email (this lets users link accounts)
          if (!user && email) {
            user = await User.findOne({ email }).select("-password");
          }

          // If user still not found, create one
          if (!user) {
            const newUserData = {
              name,
              email,
              googleId,
              // Leave password undefined for OAuth users
            };

            // create returns the full mongoose doc
            const created = await User.create(newUserData);
            // avoid returning password in the document (if model sets it)
            user = await User.findById(created._id).select("-password");
          } else if (user && !user.googleId) {
            // Attach googleId to existing user if missing, do not expose password
            user.googleId = googleId;
            await user.save();
            user = await User.findById(user._id).select("-password");
          }

          // Passport expects done(null, user) on success
          return done(null, user);
        } catch (err) {
          console.error("Error in GoogleStrategy verify callback:", err);
          return done(err, null);
        }
      }
    )
  );

  // Passport serialization/deserialization
  passport.serializeUser((user, done) => {
    // store only the user id in session (if sessions used)
    done(null, user && user._id ? user._id : user);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select("-password");
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}
