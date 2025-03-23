import { v2 as cloudinary } from "cloudinary";

const deleteFromCloudinary = async (imageUrl: string) => {
  try {
    const publicId = imageUrl
      .split("/")
      .slice(7)
      .join("/")
      .replace(/\..+$/, "");

    if (!publicId) {
      throw new Error("invalid cloudinary URL format");
    }
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      throw new Error(`cloudinary deletion failed: ${result.result}`);
    }
    return true;
  } catch (error) {
    console.error("error deleting Cloudinary asset:", error);
    throw error;
  }
};

export default deleteFromCloudinary;
