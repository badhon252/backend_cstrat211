import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";
import Category from "../models/category.model"; // Adjust path as necessary
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
    const requiredFields = ['productName', 'description', 'category', 'basePrice', 'quantity'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return sendResponse(res, 400, false, `Missing required fields: ${missingFields.join(', ')}`);
    }

    const {
      productName,
      description,
      category,
      tags,
      status = "draft",
      basePrice,
      discountType,
      discountPercentage,
      discountFixed,
      quantity,
      colors,
      height,
      length,
      width,
    } = req.body;

    // File upload handling
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const imageFiles = files?.images || [];
    const videoFiles = files?.videos || [];

    const uploadMedia = async (files: Express.Multer.File[], type: 'image' | 'video') => {
      const urls: string[] = [];
      for (const file of files) {
        try {
          const folder = `products/${type}s`;
          const url = await uploadToCloudinary(file.path, folder);
          urls.push(url);
        } catch (error) {
          console.error(`Error uploading ${type}:`, error);
          await fs.unlink(file.path).catch(() => {});
          throw new Error(`Failed to upload ${type}s`);
        }
      }
      return urls;
    };

    const [imageUrls, videoUrls] = await Promise.all([
      uploadMedia(imageFiles, 'image'),
      uploadMedia(videoFiles, 'video')
    ]);

    // Clean up tags and colors
    const cleanArray = (input: string | string[] | undefined): string[] => {
        if (!input) return [];
        const arr = Array.isArray(input) ? input : input.split(',');
        return arr.map(item => item.trim().replace(/['"]/g, ''));
      };

    // Validate discount fields
    if (discountType && !['percentage', 'fixed'].includes(discountType)) {
      return sendResponse(res, 400, false, "Discount type must be either 'percentage' or 'fixed'");
    }

    const newProduct = new Product({
      productName,
      description,
      category,
      tags: cleanArray(tags),
      status,
      images: imageUrls,
      videos: videoUrls,
      basePrice: parseFloat(basePrice),
      discountType: ['percentage', 'fixed'].includes(discountType) ? discountType : undefined,
      discountPercentage: discountPercentage ? parseFloat(discountPercentage) : undefined,
      discountFixed: discountFixed ? parseFloat(discountFixed) : undefined,
      quantity: parseInt(quantity),
      colors: cleanArray(colors),
      height: height ? parseFloat(height) : undefined,
      length: length ? parseFloat(length) : undefined,
      width: width ? parseFloat(width) : undefined,
    });

    await newProduct.save();

    const populatedProduct = await Product.findById(newProduct._id)
      .populate({
        path: 'category',
        select: 'categoryName description categoryImage'
      });

    return sendResponse(res, 201, true, "Product created statusfully", populatedProduct);
  } catch (error) {
    console.error("Error creating product:", error);

    // Clean up any uploaded files if error occurs
    if (req.files) {
      const files = Object.values(req.files).flat() as Express.Multer.File[];
      await Promise.all(files.map(file => fs.unlink(file.path).catch(() => {})));
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, `Validation error: ${messages.join(', ')}`);
    }
    if (error instanceof mongoose.Error.CastError) {
      return sendResponse(res, 400, false, "Invalid category ID");
    }
    if ((error as any).code === 11000) {
      return sendResponse(res, 409, false, "Product with this SKU already exists");
    }
    if (error instanceof Error) {
      return sendResponse(res, 400, false, error.message);
    }
    return sendResponse(res, 500, false, "Server error while creating product");
  }
};



// Get All Products
export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const { page = "1", limit = "10", search, category, status, minPrice, maxPrice } = req.query;

        const pageNumber = Math.max(1, parseInt(page as string)) || 1;
        const limitNumber = Math.max(1, Math.min(100, parseInt(limit as string))) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        const filter: any = {};

        // Search filter
        if (search) {
            filter.$or = [
                { productName: { $regex: search as string, $options: "i" } },
                { description: { $regex: search as string, $options: "i" } },
                { sku: { $regex: search as string, $options: "i" } },
            ];
        }

        // Category filter
        if (category) {
            if (mongoose.Types.ObjectId.isValid(category as string)) {
                filter.category = new mongoose.Types.ObjectId(category as string);
            } else {
                // If category is a name, find corresponding ObjectId
                const foundCategory = await Category.findOne({ categoryName: category }).select('_id');
                if (foundCategory) {
                    filter.category = foundCategory._id;
                } else {
                    return sendResponse(res, 404, false, "Category not found");
                }
            }
        }

        // Status filter
        if (status && status !== "all") {
            filter.status = status;
        }

        // Price range filter
        if (minPrice || maxPrice) {
            filter.basePrice = {};
            if (minPrice) filter.basePrice.$gte = parseFloat(minPrice as string);
            if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice as string);
        }

        // Fetch total count and paginated products
        const [total, products] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .populate({
                    path: 'category',
                    select: 'categoryName description categoryImage',
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber),
        ]);

        const totalPages = Math.ceil(total / limitNumber);

        sendResponse(res, 200, true, "Products retrieved successfully", {
            data: products,
            pagination: {
                totalItems: total,
                totalPages,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            },
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        sendResponse(res, 500, false, "Server error while fetching products");
    }
};
// Get Single Product
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, 400, false, "Invalid product ID");
      return;
    }

    const product = await Product.findById(id).populate({
      path: 'category',
      select: 'categoryName description categoryImage'
    });

    if (!product) {
      sendResponse(res, 404, false, "Product not found");
      return;
    }

    sendResponse(res, 200, true, "Product retrieved statusfully", product);
  } catch (error) {
    console.error("Error fetching product:", error);
    if (error instanceof mongoose.Error.CastError) {
      sendResponse(res, 400, false, "Invalid product ID");
    } else {
      sendResponse(res, 500, false, "Server error while fetching product");
    }
  }
};

// Update Product
const cleanArray = (input: string | string[] | undefined): string[] => {
    if (!input) return [];
    const arr = Array.isArray(input) ? input : input.split(',');
    return arr.map(item => item.trim().replace(/['"]/g, ''));
  };
  
  export const updateProduct = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        sendResponse(res, 400, false, "Invalid product ID");
        return;
      }
  
      // Handle file uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFiles = files?.images || [];
      const videoFiles = files?.videos || [];
  
      const product = await Product.findById(id);
      if (!product) {
        sendResponse(res, 404, false, "Product not found");
        return;
      }
  
      // Upload new images
      for (const file of imageFiles) {
        try {
          const result = await uploadToCloudinary(file.path, 'products/images');
          product.images.push(result);
          await fs.unlink(file.path);
        } catch (error) {
          console.error("Error uploading image:", error);
          throw new Error("Failed to upload images");
        }
      }
  
      // Upload new videos
      for (const file of videoFiles) {
        try {
          const result = await uploadToCloudinary(file.path, 'products/videos');
          product.videos.push(result);
          await fs.unlink(file.path);
        } catch (error) {
          console.error("Error uploading video:", error);
          throw new Error("Failed to upload videos");
        }
      }
  
      // Update other fields
      Object.keys(updateData).forEach((key) => {
        if (key === 'tags' || key === 'colors') {
          (product as any)[key] = cleanArray(updateData[key]);
        } else if (key !== 'images' && key !== 'videos') {
          (product as any)[key] = updateData[key];
        }
      });
  
      await product.save();
  
      const updatedProduct = await Product.findById(id).populate({
        path: 'category',
        select: 'categoryName description categoryImage'
      });
  
      sendResponse(res, 200, true, "Product updated successfully", updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
  
      // Clean up any uploaded files if an error occurs
      if (req.files) {
        const files = Object.values(req.files).flat() as Express.Multer.File[];
        await Promise.all(files.map(file => fs.unlink(file.path).catch(() => {})));
      }
  
      if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map(err => err.message);
        sendResponse(res, 400, false, `Validation error: ${messages.join(', ')}`);
      } else if (error instanceof mongoose.Error.CastError) {
        sendResponse(res, 400, false, "Invalid product ID");
      } else if (error instanceof Error) {
        sendResponse(res, 400, false, error.message);
      } else {
        sendResponse(res, 500, false, "Server error while updating product");
      }
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
  
      // Delete images from Cloudinary
      if (product.images?.length > 0) {
        try {
          await Promise.all(product.images.map((image) => deleteFromCloudinary(image)));
        } catch (error) {
          console.error("Error deleting images from Cloudinary:", error);
        }
      }
  
      // Delete videos from Cloudinary
      if (product.videos?.length > 0) {
        try {
          await Promise.all(product.videos.map((video) => deleteFromCloudinary(video)));
        } catch (error) {
          console.error("Error deleting videos from Cloudinary:", error);
        }
      }
  
      // Delete product from the database
      await Product.findByIdAndDelete(id);
  
      return sendResponse(res, 200, true, "Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      return sendResponse(res, 500, false, "Server error while deleting product");
    }
  };

// Delete Product Media
export const deleteProductMedia = async (req: Request, res: Response) => {
  try {
    const { id, mediaType, mediaUrl } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, 400, false, "Invalid product ID");
      return;
    }

    if (!['images', 'videos'].includes(mediaType)) {
      sendResponse(res, 400, false, "Invalid media type. Must be 'images' or 'videos'");
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      sendResponse(res, 404, false, "Product not found");
      return;
    }

    // Remove media URL from array
    if (mediaType === 'images') {
      product.images = product.images.filter(img => img !== mediaUrl);
    } else {
      product.videos = product.videos.filter(vid => vid !== mediaUrl);
    }

    await product.save();
    await deleteFromCloudinary(mediaUrl);

    sendResponse(res, 200, true, "Media deleted statusfully");
  } catch (error) {
    console.error("Error deleting media:", error);
    if (error instanceof mongoose.Error.CastError) {
      sendResponse(res, 400, false, "Invalid product ID");
    } else {
      sendResponse(res, 500, false, "Server error while deleting media");
    }
  }
};