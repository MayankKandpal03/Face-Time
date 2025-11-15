import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config();  // Loads MONGO_URI from .env

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connection successful");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);   
  }
};
