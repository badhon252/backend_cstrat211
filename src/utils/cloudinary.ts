import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import {
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCloudName,
} from "../config";

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
});

export const uploadToCloudinary = async (filePath: string) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "categories",
      use_filename: true,
      unique_filename: false,
    });
    return result.secure_url;
  } finally {
    await fs.unlink(filePath);
  }
};
