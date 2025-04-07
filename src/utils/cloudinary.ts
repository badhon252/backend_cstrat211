import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import {
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCloudName
} from '../config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
  secure: true
});

export const uploadToCloudinary = async (filePath: string, folder?: string): Promise<string> => {
  try {
    if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      throw new Error("Cloudinary configuration is missing");
    }

    const options = {
      folder,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      resource_type: "auto" as "auto",
    };

    const result = await cloudinary.uploader.upload(filePath, options);
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload file to Cloudinary");
  } finally {
    await fs.unlink(filePath).catch(error => {
      console.error("Error deleting temporary file:", error);
    });
  }
};
export const deleteFromCloudinary = async (url: string): Promise<void> => {
  try {
    if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      throw new Error("Cloudinary configuration is missing");
    }

    const publicId = url.split('/').slice(-2).join('/').split('.')[0];
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: url.includes('/video/upload/') ? 'video' : 'image'
      });
    }
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete file from Cloudinary");
  }
};

