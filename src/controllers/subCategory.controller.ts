import { Request, Response } from "express";
import mongoose from "mongoose";
import SubCategory from "../models/subCategory.model";
import Category from "../models/category.model";

// @desc    Create new SubCategory
// @route   POST /api/v1/subcategories
export const createSubCategory = async (req: Request, res: Response) => {
  try {
    const { subCategoryName, description, category, stock, sales } = req.body;

    if (!subCategoryName || !category) {
      res.status(400).json({
        status: false,
        message: "subCategory name and category are required",
      });
      return;
    }

    const existing = await SubCategory.findOne({ subCategoryName });
    if (existing) {
      res.status(409).json({
        status: false,
        message: "subCategory with this name already exists",
      });
      return;
    }

    const subCategory = await SubCategory.create({
      subCategoryName,
      description,
      category,
      stock,
      sales,
    });

    res.status(201).json({
      status: true,
      message: "sub category created successfully",
      subCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "server error", data: error });
    return;
  }
};

// @desc    Update SubCategory
// @route   PUT /api/v1/subcategories/:id
export const updateSubCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: "invalid id" });
      return;
    }

    const subCategory = await SubCategory.findById(id);

    if (!subCategory) {
      res.status(404).json({ status: false, message: "subCategory not found" });
      return;
    }

    const { subCategoryName, description, category, stock, sales } = req.body;

    if (subCategoryName) subCategory.subCategoryName = subCategoryName;
    if (description) subCategory.description = description;
    if (category) subCategory.category = category;
    if (stock !== undefined) subCategory.stock = stock;
    if (sales !== undefined) subCategory.sales = sales;

    const updated = await subCategory.save();
    res.status(200).json({
      status: true,
      message: "sub category update successfully",
      updated,
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error });
    return;
  }
};

// @desc    Get single SubCategory
// @route   GET /api/v1/subcategories/:id
export const getSubCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: "invalid id" });
      return;
    }

    const subCategory = await SubCategory.findById(id).populate("category");

    if (!subCategory) {
      res.status(404).json({ status: false, message: "subCategory not found" });
      return;
    }

    res.status(200).json({
      status: true,
      message: "individual sub category found successfully",
      subCategory,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "server error", error });
    return;
  }
};

// @desc    Get all SubCategories
// @route   GET /api/v1/subcategories
export const getAllSubCategories = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      sortBy = "createdAt",
      order = "desc",
      subCategoryName,
      categoryName,
      salesMin,
      salesMax,
      stockMin,
      stockMax,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const sortOrder = order === "asc" ? 1 : -1;

    const filter: any = {};

    if (subCategoryName) {
      filter.subCategoryName = {
        $regex: subCategoryName as string,
        $options: "i",
      };
    }

    if (salesMin || salesMax) {
      filter.sales = {};
      if (salesMin) filter.sales.$gte = parseInt(salesMin as string);
      if (salesMax) filter.sales.$lte = parseInt(salesMax as string);
    }

    if (stockMin || stockMax) {
      filter.stock = {};
      if (stockMin) filter.stock.$gte = parseInt(stockMin as string);
      if (stockMax) filter.stock.$lte = parseInt(stockMax as string);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    if (categoryName) {
      const matchingCategories = await Category.find({
        categoryName: { $regex: categoryName as string, $options: "i" },
      });

      const categoryIds = matchingCategories.map((cat) => cat._id);
      filter.category = { $in: categoryIds };
    }

    const total = await SubCategory.countDocuments(filter);

    const subCategories = await SubCategory.find(filter)
      .populate("category")
      .sort({ [sortBy as string]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      status: true,
      message: "subcategories fetched successfully",
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalSubCategories: total,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "server error",
      error,
    });
    return;
  }
};

// @desc    Delete SubCategory
// @route   DELETE /api/v1/subcategories/:id
export const deleteSubCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: "invalid ID" });
      return;
    }

    const subCategory = await SubCategory.findById(id);

    if (!subCategory) {
      res.status(404).json({ status: false, message: "subCategory not found" });
      return;
    }

    await subCategory.deleteOne();
    res
      .status(200)
      .json({ status: true, message: "subCategory deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: "server error", error });
    return;
  }
};
