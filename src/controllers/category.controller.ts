import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Category from "../models/category.model";
import { uploadToCloudinary } from "../utils/cloudinary";

// create category
const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { categoryName, description } = req.body;

    if (!categoryName) {
      res
        .status(400)
        .json({ status: false, message: "category name is required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "category image is required" });
      return;
    }

    const existingCategory = await Category.findOne({ categoryName });
    if (existingCategory) {
      res
        .status(409)
        .json({ status: false, message: "category already exists" });
      return;
    }

    const imageUrl = await uploadToCloudinary(req.file.path);

    const newCategory = new Category({
      categoryName,
      description,
      categoryImage: imageUrl,
    });
    await newCategory.save();

    res.status(201).json({
      status: true,
      message: "new category created successfully",
      data: newCategory,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ status: false, message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      "code" in error &&
      (error as any).code === 11000
    ) {
      res
        .status(409)
        .json({ status: false, message: "category name already exists" });
      return;
    }
    res.status(500).json({ status: false, message: "Server error" });
    return;
  }
};

export { createCategory };
