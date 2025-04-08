import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";
import Category from "../models/category.model";
import Subcategory from "../models/subCategory.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import deleteFromCloudinary from "../utils/deleteFromCloudinary";
import fs from "fs/promises";

const sendResponse = (
  res: Response,
  statusCode: number,
  status: boolean,
  message: string,
  data?: any
) => {
  res.status(statusCode).json({ status, message, data });
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const requiredFields = [
      "name",
      "description",
      "price",
      "category",
      "subcategory",
      "type",
      "quantity",
      "isCustomizable",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return sendResponse(
        res,
        400,
        false,
        `Missing required fields: ${missingFields.join(", ")}`
      );
    }

    // Validate category and subcategory
    const [category, subcategory] = await Promise.all([
      Category.findById(req.body.category),
      Subcategory.findById(req.body.subcategory),
    ]);

    if (!category) {
      return sendResponse(res, 400, false, "Invalid category ID");
    }
    if (!subcategory) {
      return sendResponse(res, 400, false, "Invalid subcategory ID");
    }
  if (subcategory.category.toString() !== (category as any)._id.toString()) {
      return sendResponse(
        res,
        400,
        false,
        "Subcategory does not belong to the specified category"
      );
    }

    // Parse isCustomizable
    const isCustomizable = req.body.isCustomizable === "true" || req.body.isCustomizable === true;

    // Handle file uploads for non-customizable products
    let imageUrls: string[] = [];
    let videoUrls: string[] = [];
    if (!isCustomizable) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFiles = files?.images || [];
      const videoFiles = files?.videos || [];

      if (imageFiles.length === 0) {
        return sendResponse(res, 400, false, "At least one image is required for non-customizable products");
      }

      const uploadMedia = async (files: Express.Multer.File[], type: "image" | "video") => {
        const urls: string[] = [];
        for (const file of files) {
          try {
            const folder = `products/${type}s`;
            const url = await uploadToCloudinary(file.path, folder);
            urls.push(url);
            await fs.unlink(file.path).catch(() => {});
          } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            throw new Error(`Failed to upload ${type}`);
          }
        }
        return urls;
      };

      try {
        [imageUrls, videoUrls] = await Promise.all([
          uploadMedia(imageFiles, "image"),
          uploadMedia(videoFiles, "video"),
        ]);
      } catch (error) {
        await Promise.all([
          ...imageUrls.map((url) => deleteFromCloudinary(url).catch(() => {})),
          ...videoUrls.map((url) => deleteFromCloudinary(url).catch(() => {})),
        ]);
        throw error;
      }
    }

    // Process sizes and colors for customizable products
    let sizes: string[] = [];
    let colors: any[] = [];
    if (isCustomizable) {
      if (req.body.sizes) {
        sizes = Array.isArray(req.body.sizes) ? req.body.sizes : req.body.sizes.split(",");
        if (sizes.length === 0) {
          return sendResponse(res, 400, false, "Sizes must not be empty for customizable products");
        }
      } else {
        return sendResponse(res, 400, false, "Sizes are required for customizable products");
      }

      if (req.body.colors) {
        try {
          colors = typeof req.body.colors === "string" ? JSON.parse(req.body.colors) : req.body.colors;
          if (!Array.isArray(colors) || colors.length === 0) {
            return sendResponse(res, 400, false, "Colors must be a non-empty array for customizable products");
          }
          for (const color of colors) {
            if (!color.name || !color.hex) {
              return sendResponse(res, 400, false, "Each color must have a name and hex value");
            }
            if (color.images && typeof color.images !== "object") {
              return sendResponse(res, 400, false, "Color images must be an object");
            }
          }
        } catch (error) {
          return sendResponse(res, 400, false, "Invalid color variants format");
        }
      } else {
        return sendResponse(res, 400, false, "Colors are required for customizable products");
      }
    }

    // Generate a unique SKU if not provided
    const sku = req.body.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Create new product
    const newProduct = new Product({
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      subcategory: req.body.subcategory,
      type: req.body.type,
      sustainability: req.body.sustainability || "none",
      rating: req.body.rating ? parseFloat(req.body.rating) : 0,
      reviewCount: req.body.reviewCount ? parseInt(req.body.reviewCount) : 0,
      popularity: req.body.popularity ? parseInt(req.body.popularity) : 0,
      quantity: parseInt(req.body.quantity),
      isCustomizable,
      media: {
        images: isCustomizable ? [] : imageUrls,
        videos: isCustomizable ? [] : videoUrls,
      },
      sizes: isCustomizable ? sizes : [],
      colors: isCustomizable ? colors : [],
      sku,
    });

    await newProduct.save();

    // Populate category and subcategory
    const populatedProduct = await Product.findById(newProduct._id)
      .populate({
        path: "category",
        select: "categoryName description",
      })
      .populate({
        path: "subcategory",
        select: "subCategoryName description",
      });

    if (!populatedProduct) {
      throw new Error("Failed to retrieve populated product");
    }

    // Format response
    const responseProduct = {
      id: populatedProduct._id,
      name: populatedProduct.name,
      description: populatedProduct.description,
      price: populatedProduct.price,
      category: (populatedProduct.category as any)?.categoryName || "",
      subcategory: (populatedProduct.subcategory as any)?.subCategoryName || "",
      type: populatedProduct.type,
      sustainability: populatedProduct.sustainability,
      rating: populatedProduct.rating,
      reviewCount: populatedProduct.reviewCount,
      popularity: populatedProduct.popularity,
      quantity: populatedProduct.quantity,
      inStock: populatedProduct.inStock,
      createdAt: populatedProduct.createdAt,
      isCustomizable: populatedProduct.isCustomizable,
      media: populatedProduct.media,
      sizes: populatedProduct.sizes,
      colors: populatedProduct.colors,
      sku: populatedProduct.sku,
    };

    return sendResponse(res, 201, true, "Product created successfully", responseProduct);
  } catch (error) {
    console.error("Error creating product:", error);

    // Clean up temporary files
    if (req.files) {
      const files = Object.values(req.files).flat() as Express.Multer.File[];
      await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendResponse(res, 400, false, `Validation error: ${messages.join(", ")}`);
    }
    if (error instanceof mongoose.Error.CastError) {
      return sendResponse(res, 400, false, "Invalid ID format");
    }
    if ((error as any).code === 11000) {
      return sendResponse(res, 409, false, "Product with this SKU or name already exists");
    }
    return sendResponse(res, 500, false, "Server error while creating product");
  }
};

// Get all products
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    // Extract query parameters
    const {
      category,
      status = "all",
      page = "1",
      limit = "20",
      minPrice,
      maxPrice,
    } = req.query;

    // Build query object
    const query: any = {};

    // Filter by category (case-insensitive)
    if (category) {
      const categoryDoc = await Category.findOne({
        categoryName: { $regex: new RegExp(category as string, "i") },
      });
      if (!categoryDoc) {
        return sendResponse(res, 404, false, "Category not found");
      }
      query.category = categoryDoc._id;
    }

    // Filter by stock status
    if (status === "inStock") {
      query.inStock = true;
    } else if (status === "outOfStock") {
      query.inStock = false;
    } // "all" means no filter on inStock

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice as string);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice as string);
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Fetch products with pagination and populate category/subcategory
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate({
          path: "category",
          select: "categoryName description",
        })
        .populate({
          path: "subcategory",
          select: "subCategoryName description",
        })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Format response
    const responseProducts = products.map((product) => ({
      id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: (product.category as any)?.categoryName || "",
      subcategory: (product.subcategory as any)?.subCategoryName || "",
      type: product.type,
      sustainability: product.sustainability,
      rating: product.rating,
      reviewCount: product.reviewCount,
      popularity: product.popularity,
      quantity: product.quantity,
      inStock: product.inStock,
      createdAt: product.createdAt,
      isCustomizable: product.isCustomizable,
      media: product.media,
      sizes: product.sizes,
      colors: product.colors,
      sku: product.sku,
    }));

    const response = {
      products: responseProducts,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };

    return sendResponse(res, 200, true, "Products retrieved successfully", response);
  } catch (error) {
    console.error("Error retrieving products:", error);
    return sendResponse(res, 500, false, "Server error while retrieving products");
  }
};

// Get Single Product
export const getSingleProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: "category",
        select: "categoryName description",
      })
      .populate({
        path: "subcategory",
        select: "subCategoryName description",
      });

    if (!product) {
      return sendResponse(res, 404, false, "Product not found");
    }

    return sendResponse(res, 200, true, "Product fetched successfully", product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return sendResponse(res, 500, false, "Server error while fetching product");
  }
};

// Update Product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, "Invalid product ID");
    }

    const product = await Product.findById(id);
    if (!product) {
      return sendResponse(res, 404, false, "Product not found");
    }

    // Parse isCustomizable from request or keep existing
    const isCustomizable = req.body.isCustomizable
      ? req.body.isCustomizable === "true" || req.body.isCustomizable === true
      : product.isCustomizable;

    // Handle file uploads for non-customizable products
    let imageUrls = product.media.images;
    let videoUrls = product.media.videos;
    if (!isCustomizable && req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFiles = files?.images || [];
      const videoFiles = files?.videos || [];

      const uploadMedia = async (files: Express.Multer.File[], type: "image" | "video") => {
        const urls: string[] = [];
        for (const file of files) {
          try {
            const folder = `products/${type}s`;
            const url = await uploadToCloudinary(file.path, folder);
            urls.push(url);
            await fs.unlink(file.path).catch(() => {});
          } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            throw new Error(`Failed to upload ${type}`);
          }
        }
        return urls;
      };

      try {
        if (imageFiles.length > 0) {
          imageUrls = await uploadMedia(imageFiles, "image");
        }
        if (videoFiles.length > 0) {
          videoUrls = await uploadMedia(videoFiles, "video");
        }
      } catch (error) {
        await Promise.all([
          ...imageUrls.map((url) => deleteFromCloudinary(url).catch(() => {})),
          ...videoUrls.map((url) => deleteFromCloudinary(url).catch(() => {})),
        ]);
        throw error;
      }
    }

    // Process sizes and colors for customizable products
    let sizes = product.sizes;
    let colors = product.colors;
    if (isCustomizable) {
      if (req.body.sizes) {
        sizes = Array.isArray(req.body.sizes) ? req.body.sizes : req.body.sizes.split(",");
      }
      if (req.body.colors) {
        try {
          colors = typeof req.body.colors === "string" ? JSON.parse(req.body.colors) : req.body.colors;
          if (!Array.isArray(colors)) {
            return sendResponse(res, 400, false, "Colors must be an array");
          }
          for (const color of colors) {
            if (!color.name || !color.hex) {
              return sendResponse(res, 400, false, "Each color must have a name and hex value");
            }
            if (color.images && typeof color.images !== "object") {
              return sendResponse(res, 400, false, "Color images must be an object");
            }
          }
        } catch (error) {
          return sendResponse(res, 400, false, "Invalid color variants format");
        }
      }
    }

    // Update only provided fields
    const updateData: any = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.price) updateData.price = parseFloat(req.body.price);
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category) return sendResponse(res, 400, false, "Invalid category ID");
      updateData.category = req.body.category;
    }
    if (req.body.subcategory) {
      const subcategory = await Subcategory.findById(req.body.subcategory);
      if (!subcategory) return sendResponse(res, 400, false, "Invalid subcategory ID");
      if (subcategory.category.toString() !== (updateData.category || product.category).toString()) {
        return sendResponse(res, 400, false, "Subcategory does not belong to the specified category");
      }
      updateData.subcategory = req.body.subcategory;
    }
    if (req.body.type) updateData.type = req.body.type;
    if (req.body.sustainability) updateData.sustainability = req.body.sustainability;
    if (req.body.rating) updateData.rating = parseFloat(req.body.rating);
    if (req.body.reviewCount) updateData.reviewCount = parseInt(req.body.reviewCount);
    if (req.body.popularity) updateData.popularity = parseInt(req.body.popularity);
    if (req.body.quantity) updateData.quantity = parseInt(req.body.quantity);
    if (req.body.sku) updateData.sku = req.body.sku;
    updateData.isCustomizable = isCustomizable;
    updateData.media = { images: isCustomizable ? [] : imageUrls, videos: isCustomizable ? [] : videoUrls };
    updateData.sizes = isCustomizable ? sizes : [];
    updateData.colors = isCustomizable ? colors : [];

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "category",
        select: "categoryName description",
      })
      .populate({
        path: "subcategory",
        select: "subCategoryName description",
      });

    if (!updatedProduct) {
      return sendResponse(res, 404, false, "Product not found after update");
    }

    const responseProduct = {
      id: updatedProduct._id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedProduct.price,
      category: (updatedProduct.category as any)?.categoryName || "",
      subcategory: (updatedProduct.subcategory as any)?.subCategoryName || "",
      type: updatedProduct.type,
      sustainability: updatedProduct.sustainability,
      rating: updatedProduct.rating,
      reviewCount: updatedProduct.reviewCount,
      popularity: updatedProduct.popularity,
      quantity: updatedProduct.quantity,
      inStock: updatedProduct.inStock,
      createdAt: updatedProduct.createdAt,
      isCustomizable: updatedProduct.isCustomizable,
      media: updatedProduct.media,
      sizes: updatedProduct.sizes,
      colors: updatedProduct.colors,
      sku: updatedProduct.sku,
    };

    return sendResponse(res, 200, true, "Product updated successfully", responseProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    if (req.files) {
      const files = Object.values(req.files).flat() as Express.Multer.File[];
      await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
    }
    if ((error as any).code === 11000) {
      return sendResponse(res, 409, false, "Product with this SKU or name already exists");
    }
    return sendResponse(res, 500, false, "Server error while updating product");
  }
};

// Delete Product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, "Invalid product ID");
    }

    const product = await Product.findById(id);
    if (!product) {
      return sendResponse(res, 404, false, "Product not found");
    }

    // Delete associated media from Cloudinary if non-customizable
    if (!product.isCustomizable) {
      const deletePromises = [
        ...product.media.images.map((url) => deleteFromCloudinary(url).catch(() => {})),
        ...product.media.videos.map((url) => deleteFromCloudinary(url).catch(() => {})),
      ];
      await Promise.all(deletePromises);
    }

    await Product.findByIdAndDelete(id);

    return sendResponse(res, 200, true, "Product deleted successfully", { id });
  } catch (error) {
    console.error("Error deleting product:", error);
    return sendResponse(res, 500, false, "Server error while deleting product");
  }
};