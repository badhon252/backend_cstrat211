import mongoose from "mongoose";
import { mongodbUrl } from "../config/index";

const dbConfig = async () => {
  try {
    await mongoose.connect(mongodbUrl);
    console.log("database connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

export default dbConfig;
