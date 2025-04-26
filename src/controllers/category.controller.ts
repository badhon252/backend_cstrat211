import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Category from "../models/category.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import deleteFromCloudinary from "../utils/deleteFromCloudinary";
import Product from "../models/product.model";
import Payment from "../models/payment.model";
import Order from "../models/order.model";

// create category
const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { categoryName, description, sales } = req.body;

    if (!categoryName) {
      res
        .status(400)
        .json({ status: false, message: "category name is required" });
      return;
    }

    const existingCategory = await Category.findOne({ categoryName });
    if (existingCategory) {
      res
        .status(409)
        .json({ status: false, message: "category already exists" });
      return;
    }

    let imageUrl;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.path);
    }

    const newCategory = new Category({
      categoryName,
      description,
      ...(imageUrl && { categoryImage: imageUrl }),
      sales,
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

// update category
const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { categoryName, description } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json({ status: false, message: "category not found" });
      return;
    }

    if (categoryName) {
      const existingCategory = await Category.findOne({
        categoryName,
        _id: { $ne: id },
      });

      if (existingCategory) {
        res.status(409).json({
          status: false,
          message: "category name already exists",
        });
        return;
      }
      category.categoryName = categoryName;
    }

    if (description !== undefined) {
      category.description = description;
    }

    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.path);
      category.categoryImage = imageUrl;
    }
    await category.save();

    res.status(200).json({
      status: true,
      message: "category updated successfully",
      data: category,
    });
    return;
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
      res.status(409).json({
        status: false,
        message: "category name already exists",
      });
      return;
    }
    res.status(500).json({ status: false, message: "server error" });
    return;
  }
};

// get all categories
const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "10", search, sales } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string)) || 1;
    const limitNumber = Math.max(1, Math.min(100, parseInt(limit as string))) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const filter: Record<string, any> = {};

    if (search) {
      filter.categoryName = {
        $regex: search as string,
        $options: "i",
      };
    }

    if (sales) {
      if (sales === "true") {
        filter.sales = { $gt: 0 };
      } else if (!isNaN(Number(sales))) {
        filter.sales = { $gte: Number(sales) };
      }
    }



    // Using aggregation for better performance
    const aggregationPipeline: any[] = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNumber },
      // Lookup products to calculate stock
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products"
        }
      },
      // Lookup payments and orders to calculate sales
      {
        $lookup: {
          from: "payments",
          let: { categoryId: "$_id" },
          pipeline: [
            { $match: { paymentStatus: "completed" } },
            { $unwind: "$orderId" },
            {
              $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "order"
              }
            },
            { $unwind: "$order" },
            { $unwind: "$order.products" },
            {
              $lookup: {
                from: "products",
                localField: "order.products.product",
                foreignField: "_id",
                as: "orderProduct"
              }
            },
            { $unwind: "$orderProduct" },
            {
              $match: {
                $expr: { $eq: ["$orderProduct.category", "$$categoryId"] }
              }
            },
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$order.products.quantity" }
              }
            }
          ],
          as: "salesData"
        }
      },
      // Add calculated fields
      {
        $addFields: {
          stock: { $sum: "$products.quantity" },
          sales: { $ifNull: [{ $arrayElemAt: ["$salesData.totalSales", 0] }, 0] }
        }
      },
      // Project only the fields we want
      {
        $project: {
          products: 0,
          salesData: 0
        }
      }
    ];

    // Get total count for pagination
    const totalPromise = Category.countDocuments(filter);
    // Get aggregated categories
    const categoriesPromise = Category.aggregate(aggregationPipeline);

    const [total, categories] = await Promise.all([totalPromise, categoriesPromise]);

    const totalPages = Math.ceil(total / limitNumber);

    res.status(200).json({
      status: true,
      message: "categories retrieved successfully",
      data: categories,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: pageNumber,
        itemsPerPage: limitNumber,
        nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
        prevPage: pageNumber > 1 ? pageNumber - 1 : null,
      },
      search: {
        term: search || null,
        results: categories.length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "CastError") {
      res.status(400).json({
        status: false,
        message: "invalid pagination parameters",
      });
      return;
    }

    console.error("Error fetching categories:", error);
    res.status(500).json({
      status: false,
      message: "server error",
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
};

// get a single category by id
const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      res.status(404).json({ status: false, message: "category not found" });
      return;
    }

    res.status(200).json({
      status: true,
      message: "category retrieved successfully",
      data: category,
    });
    return;
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      res.status(400).json({ status: false, message: "invalid category id" });
      return;
    }
    res.status(500).json({ status: false, message: "server error" });
    return;
  }
};

// delete category
const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      res.status(404).json({
        status: false,
        message: "category not found",
      });
      return;
    }

    if (deletedCategory.categoryImage) {
      await deleteFromCloudinary(deletedCategory.categoryImage);
    }
    

    res.status(200).json({
      status: true,
      message: "category deleted successfully",
      data: deletedCategory,
    });
    return;
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      if (error instanceof mongoose.Error.CastError) {
        res.status(400).json({ status: false, message: "invalid category id" });
        return;
      }
      res.status(500).json({ status: false, message: "server error" });
      return;
    }
  }
};

export {
  createCategory,
  updateCategory,
  getAllCategories,
  getCategoryById,
  deleteCategory,
};
