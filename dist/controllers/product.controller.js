"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilteredProducts = exports.deleteProduct = exports.updateProduct = exports.getSingleProduct = exports.getAllProducts = exports.createProduct = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const product_model_1 = __importDefault(require("../models/product.model"));
const category_model_1 = __importDefault(require("../models/category.model"));
const subCategory_model_1 = __importDefault(require("../models/subCategory.model"));
const cloudinary_1 = require("../utils/cloudinary");
const deleteFromCloudinary_1 = __importDefault(require("../utils/deleteFromCloudinary"));
const promises_1 = __importDefault(require("fs/promises"));
const subCategory_model_2 = __importDefault(require("../models/subCategory.model"));
const sendResponse = (res, statusCode, status, message, data) => {
    res.status(statusCode).json({ status, message, data });
};
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Validate required fields
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
            return sendResponse(res, 400, false, `Missing required fields: ${missingFields.join(", ")}`);
        }
        // Validate category and subcategory
        const [category, subcategory] = yield Promise.all([
            category_model_1.default.findById(req.body.category),
            subCategory_model_1.default.findById(req.body.subcategory),
        ]);
        if (!category)
            return sendResponse(res, 400, false, "Invalid category ID");
        if (!subcategory)
            return sendResponse(res, 400, false, "Invalid subcategory ID");
        if (subcategory.category.toString() !== category._id.toString()) {
            return sendResponse(res, 400, false, "Subcategory does not belong to the specified category");
        }
        // Parse isCustomizable
        const isCustomizable = req.body.isCustomizable === "true" || req.body.isCustomizable === true;
        // Handle media uploads
        let imageUrls = [];
        let videoUrls = [];
        if (!isCustomizable) {
            const files = req.files;
            const imageFiles = (files === null || files === void 0 ? void 0 : files.images) || [];
            const videoFiles = (files === null || files === void 0 ? void 0 : files.videos) || [];
            if (imageFiles.length === 0) {
                return sendResponse(res, 400, false, "At least one image is required for non-customizable products");
            }
            const uploadMedia = (files, type) => __awaiter(void 0, void 0, void 0, function* () {
                const urls = [];
                for (const file of files) {
                    try {
                        const folder = `products/${type}s`;
                        const url = yield (0, cloudinary_1.uploadToCloudinary)(file.path, folder);
                        urls.push(url);
                        yield promises_1.default.unlink(file.path).catch(() => { });
                    }
                    catch (error) {
                        console.error(`Error uploading ${type}:`, error);
                        throw new Error(`Failed to upload ${type}`);
                    }
                }
                return urls;
            });
            try {
                [imageUrls, videoUrls] = yield Promise.all([
                    uploadMedia(imageFiles, "image"),
                    uploadMedia(videoFiles, "video"),
                ]);
            }
            catch (error) {
                yield Promise.all([
                    ...imageUrls.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })),
                    ...videoUrls.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })),
                ]);
                throw error;
            }
        }
        // CHANGED: Process sizes for all products (not just customizable ones)
        let sizes = [];
        if (req.body.sizes) {
            sizes = Array.isArray(req.body.sizes)
                ? req.body.sizes
                : req.body.sizes.split(",");
        }
        // Process colors only for customizable products
        let colors = [];
        if (isCustomizable) {
            // Process colors
            if (req.body.colors) {
                try {
                    colors =
                        typeof req.body.colors === "string"
                            ? JSON.parse(req.body.colors)
                            : req.body.colors;
                    if (!Array.isArray(colors) || colors.length === 0) {
                        return sendResponse(res, 400, false, "Colors must be a non-empty array for customizable products");
                    }
                    // Handle color images upload
                    const files = req.files;
                    for (let i = 0; i < colors.length; i++) {
                        const color = colors[i];
                        if (!color.name || !color.hex) {
                            return sendResponse(res, 400, false, "Each color must have a name and hex value");
                        }
                        // Get all files for this color index (e.g., colorImages[0])
                        const colorImageFiles = (files === null || files === void 0 ? void 0 : files[`colorImages[${i}]`]) || [];
                        // Upload all images for this color
                        const uploadedImages = yield Promise.all(colorImageFiles.map((file) => __awaiter(void 0, void 0, void 0, function* () {
                            try {
                                const folder = `products/colors/${color.name.toLowerCase()}`;
                                const url = yield (0, cloudinary_1.uploadToCloudinary)(file.path, folder);
                                yield promises_1.default.unlink(file.path).catch(() => { });
                                return url;
                            }
                            catch (error) {
                                console.error(`Error uploading image for color ${color.name}:`, error);
                                throw new Error(`Failed to upload image for color ${color.name}`);
                            }
                        })));
                        color.images = uploadedImages;
                    }
                }
                catch (error) {
                    console.error("Error processing colors:", error);
                    return sendResponse(res, 400, false, "Invalid color variants format");
                }
            }
            else {
                return sendResponse(res, 400, false, "Colors are required for customizable products");
            }
        }
        // Generate SKU
        const sku = req.body.sku ||
            `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        // Create new product
        const newProduct = new product_model_1.default({
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            discountParcentage: req.body.discountParcentage,
            category: req.body.category,
            subcategory: req.body.subcategory,
            type: req.body.type,
            status: req.body.status || "draft", // Default to "draft" if not provided
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
            sizes, // CHANGED: Now includes sizes for all products
            colors: isCustomizable ? colors : [],
            sku,
        });
        yield newProduct.save();
        // Populate and format response
        const populatedProduct = yield product_model_1.default.findById(newProduct._id)
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
        // CHANGED: Ensure consistent response format for sizes and colors
        const responseProduct = {
            id: populatedProduct._id,
            name: populatedProduct.name,
            description: populatedProduct.description,
            price: populatedProduct.price * (1 - (populatedProduct.discountParcentage || 0) / 100), // Calculate discounted price
            discountParcentage: populatedProduct.discountParcentage,
            category: ((_a = populatedProduct.category) === null || _a === void 0 ? void 0 : _a.categoryName) || "",
            subcategory: ((_b = populatedProduct.subcategory) === null || _b === void 0 ? void 0 : _b.subCategoryName) || "",
            type: populatedProduct.type,
            status: populatedProduct.status,
            sustainability: populatedProduct.sustainability,
            rating: populatedProduct.rating,
            reviewCount: populatedProduct.reviewCount,
            popularity: populatedProduct.popularity,
            quantity: populatedProduct.quantity,
            inStock: populatedProduct.inStock,
            createdAt: populatedProduct.createdAt,
            isCustomizable: populatedProduct.isCustomizable,
            media: {
                images: populatedProduct.isCustomizable
                    ? Array.from(new Set(populatedProduct.colors.flatMap((color) => color.images)))
                    : populatedProduct.media.images,
                videos: populatedProduct.media.videos,
            },
            sizes: populatedProduct.sizes || [],
            colors: populatedProduct.isCustomizable
                ? populatedProduct.colors.map((color) => ({
                    name: color.name,
                    hex: color.hex,
                    images: color.images,
                    _id: color._id,
                }))
                : [],
            sku: populatedProduct.sku,
        };
        return sendResponse(res, 201, true, "Product created successfully", responseProduct);
    }
    catch (error) {
        console.error("Error creating product:", error);
        // Clean up files
        if (req.files) {
            const files = Object.values(req.files).flat();
            yield Promise.all(files.map((file) => promises_1.default.unlink(file.path).catch(() => { })));
        }
        // Error handling
        if (error instanceof mongoose_1.default.Error.ValidationError) {
            const messages = Object.values(error.errors).map((err) => err.message);
            return sendResponse(res, 400, false, `Validation error: ${messages.join(", ")}`);
        }
        if (error instanceof mongoose_1.default.Error.CastError) {
            return sendResponse(res, 400, false, "Invalid ID format");
        }
        if (error.code === 11000) {
            return sendResponse(res, 409, false, "Product with this SKU or name already exists");
        }
        return sendResponse(res, 500, false, "Server error while creating product");
    }
});
exports.createProduct = createProduct;
// Get all products
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract query parameters
        const { category, subcategory, // Add subcategory parameter
        status = "all", page = "1", limit = "20", minPrice, maxPrice, } = req.query;
        // Build query object
        const query = {};
        // Filter by category (case-insensitive)
        if (category) {
            const categoryDoc = yield category_model_1.default.findOne({
                categoryName: { $regex: new RegExp(category, "i") },
            });
            if (!categoryDoc) {
                return sendResponse(res, 404, false, "Category not found");
            }
            query.category = categoryDoc._id;
        }
        // Filter by subcategory (case-insensitive)
        if (subcategory) {
            const subcategoryDoc = yield subCategory_model_2.default.findOne({
                subCategoryName: { $regex: new RegExp(subcategory, "i") },
            });
            if (!subcategoryDoc) {
                return sendResponse(res, 404, false, "Subcategory not found");
            }
            query.subcategory = subcategoryDoc._id;
        }
        // Filter by stock status
        if (status === "inStock") {
            query.inStock = true;
        }
        else if (status === "outOfStock") {
            query.inStock = false;
        } // "all" means no filter on inStock
        // Filter by price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice)
                query.price.$gte = parseFloat(minPrice);
            if (maxPrice)
                query.price.$lte = parseFloat(maxPrice);
        }
        // Pagination
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * limitNum;
        // Fetch products with pagination and populate category/subcategory
        const [products, total] = yield Promise.all([
            product_model_1.default.find(query)
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
            product_model_1.default.countDocuments(query),
        ]);
        // Format response
        const responseProducts = products.map((product) => {
            var _a, _b;
            return ({
                id: product._id,
                name: product.name,
                description: product.description,
                price: product.price * (1 - (product.discountParcentage || 0) / 100), // Calculate discounted price
                discountParcentage: product.discountParcentage,
                category: ((_a = product.category) === null || _a === void 0 ? void 0 : _a.categoryName) || "",
                subcategory: ((_b = product.subcategory) === null || _b === void 0 ? void 0 : _b.subCategoryName) || "",
                type: product.type,
                status: product.status,
                sustainability: product.sustainability,
                rating: product.rating,
                reviewCount: product.reviewCount,
                popularity: product.popularity,
                quantity: product.quantity,
                inStock: product.inStock,
                createdAt: product.createdAt,
                isCustomizable: product.isCustomizable,
                media: {
                    images: product.isCustomizable
                        ? Array.from(new Set(product.colors.flatMap((color) => color.images)))
                        : product.media.images,
                    videos: product.media.videos,
                },
                sizes: product.sizes,
                colors: product.colors,
                sku: product.sku,
            });
        });
        const response = {
            products: responseProducts,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        };
        return sendResponse(res, 200, true, "Products retrieved successfully", response);
    }
    catch (error) {
        console.error("Error retrieving products:", error);
        return sendResponse(res, 500, false, "Server error while retrieving products");
    }
});
exports.getAllProducts = getAllProducts;
// Get Single Product
const getSingleProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield product_model_1.default.findById(req.params.id)
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
    }
    catch (error) {
        console.error("Error fetching product:", error);
        return sendResponse(res, 500, false, "Server error while fetching product");
    }
});
exports.getSingleProduct = getSingleProduct;
// Update Product
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return sendResponse(res, 400, false, "Invalid product ID");
        }
        const product = yield product_model_1.default.findById(id);
        if (!product) {
            return sendResponse(res, 404, false, "Product not found");
        }
        // Parse isCustomizable
        const isCustomizable = req.body.isCustomizable
            ? req.body.isCustomizable === "true" || req.body.isCustomizable === true
            : product.isCustomizable;
        // Handle media uploads for non-customizable products
        let imageUrls = product.media.images;
        let videoUrls = product.media.videos;
        if (!isCustomizable && req.files) {
            const files = req.files;
            const imageFiles = (files === null || files === void 0 ? void 0 : files.images) || [];
            const videoFiles = (files === null || files === void 0 ? void 0 : files.videos) || [];
            const uploadMedia = (files, type) => __awaiter(void 0, void 0, void 0, function* () {
                const urls = [];
                for (const file of files) {
                    try {
                        const folder = `products/${type}s`;
                        const url = yield (0, cloudinary_1.uploadToCloudinary)(file.path, folder);
                        urls.push(url);
                        yield promises_1.default.unlink(file.path).catch(() => { });
                    }
                    catch (error) {
                        console.error(`Error uploading ${type}:`, error);
                        throw new Error(`Failed to upload ${type}`);
                    }
                }
                return urls;
            });
            try {
                if (imageFiles.length > 0) {
                    // Delete old images
                    yield Promise.all(imageUrls.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })));
                    imageUrls = yield uploadMedia(imageFiles, "image");
                }
                if (videoFiles.length > 0) {
                    // Delete old videos
                    yield Promise.all(videoUrls.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })));
                    videoUrls = yield uploadMedia(videoFiles, "video");
                }
            }
            catch (error) {
                yield Promise.all([
                    ...imageUrls.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })),
                    ...videoUrls.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })),
                ]);
                throw error;
            }
        }
        // Process sizes and colors for customizable products
        let sizes = product.sizes;
        let colors = product.colors;
        if (isCustomizable) {
            // Process sizes
            if (req.body.sizes) {
                sizes = Array.isArray(req.body.sizes)
                    ? req.body.sizes
                    : req.body.sizes.split(",");
            }
            // Process colors
            if (req.body.colors) {
                try {
                    const newColors = typeof req.body.colors === "string"
                        ? JSON.parse(req.body.colors)
                        : req.body.colors;
                    if (!Array.isArray(newColors)) {
                        return sendResponse(res, 400, false, "Colors must be an array");
                    }
                    const files = req.files;
                    // Process each color with its images
                    colors = yield Promise.all(newColors.map((newColor, index) => __awaiter(void 0, void 0, void 0, function* () {
                        var _a;
                        if (!newColor.name || !newColor.hex) {
                            throw new Error("Each color must have a name and hex value");
                        }
                        // Find existing color
                        const existingColor = product.colors.find((c) => {
                            var _a, _b;
                            return ((_a = c === null || c === void 0 ? void 0 : c._id) === null || _a === void 0 ? void 0 : _a.toString()) === ((_b = newColor._id) === null || _b === void 0 ? void 0 : _b.toString()) ||
                                (c.name === newColor.name && c.hex === newColor.hex);
                        });
                        // Get files for this color index
                        const colorImageFiles = (files === null || files === void 0 ? void 0 : files[`colorImages[${index}]`]) || [];
                        // Handle images
                        let images = (existingColor === null || existingColor === void 0 ? void 0 : existingColor.images) || [];
                        if (colorImageFiles.length > 0) {
                            // Delete old images if they exist
                            if ((_a = existingColor === null || existingColor === void 0 ? void 0 : existingColor.images) === null || _a === void 0 ? void 0 : _a.length) {
                                yield Promise.all(existingColor.images.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })));
                            }
                            // Upload new images
                            images = yield Promise.all(colorImageFiles.map((file) => __awaiter(void 0, void 0, void 0, function* () {
                                const folder = `products/colors/${newColor.name.toLowerCase()}`;
                                const url = yield (0, cloudinary_1.uploadToCloudinary)(file.path, folder);
                                yield promises_1.default.unlink(file.path).catch(() => { });
                                return url;
                            })));
                        }
                        return {
                            name: newColor.name,
                            hex: newColor.hex,
                            images,
                            _id: (existingColor === null || existingColor === void 0 ? void 0 : existingColor._id) || new mongoose_1.default.Types.ObjectId(),
                        };
                    })));
                }
                catch (error) {
                    console.error("Error processing colors:", error);
                    return sendResponse(res, 400, false, error instanceof Error
                        ? error.message
                        : "Invalid color variants format");
                }
            }
        }
        // Prepare update data
        const updateData = {
            name: req.body.name || product.name,
            description: req.body.description || product.description,
            price: req.body.price ? parseFloat(req.body.price) : product.price, // Update with original price
            discountParcentage: req.body.discountParcentage
                ? parseFloat(req.body.discountParcentage)
                : product.discountParcentage, // Update discount percentage
            type: req.body.type || product.type,
            status: req.body.status || product.status,
            sustainability: req.body.sustainability || product.sustainability,
            rating: req.body.rating ? parseFloat(req.body.rating) : product.rating,
            reviewCount: req.body.reviewCount
                ? parseInt(req.body.reviewCount)
                : product.reviewCount,
            popularity: req.body.popularity
                ? parseInt(req.body.popularity)
                : product.popularity,
            quantity: req.body.quantity
                ? parseInt(req.body.quantity)
                : product.quantity,
            isCustomizable,
            media: {
                images: isCustomizable ? [] : imageUrls,
                videos: isCustomizable ? [] : videoUrls,
            },
            sizes: isCustomizable ? sizes : [],
            colors: isCustomizable ? colors : [],
        };
        // Validate price and discountParcentage
        if (req.body.price) {
            const price = parseFloat(req.body.price);
            if (isNaN(price) || price < 0) {
                return sendResponse(res, 400, false, "Price must be a positive number");
            }
        }
        if (req.body.discountParcentage) {
            const discountParcentage = parseFloat(req.body.discountParcentage);
            if (isNaN(discountParcentage) ||
                discountParcentage < 0 ||
                discountParcentage > 100) {
                return sendResponse(res, 400, false, "Discount percentage must be between 0 and 100");
            }
        }
        // Handle category and subcategory
        if (req.body.category) {
            const category = yield category_model_1.default.findById(req.body.category);
            if (!category)
                return sendResponse(res, 400, false, "Invalid category ID");
            updateData.category = req.body.category;
        }
        if (req.body.subcategory) {
            const subcategory = yield subCategory_model_1.default.findById(req.body.subcategory);
            if (!subcategory)
                return sendResponse(res, 400, false, "Invalid subcategory ID");
            const categoryId = updateData.category || product.category;
            if (subcategory.category.toString() !== categoryId.toString()) {
                return sendResponse(res, 400, false, "Subcategory does not belong to the specified category");
            }
            updateData.subcategory = req.body.subcategory;
        }
        // Handle SKU
        if (req.body.sku) {
            updateData.sku = req.body.sku;
        }
        // Update product
        const updatedProduct = yield product_model_1.default.findByIdAndUpdate(id, updateData, {
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
        // Format response with discounted price
        const responseProduct = {
            id: updatedProduct._id,
            name: updatedProduct.name,
            description: updatedProduct.description,
            price: updatedProduct.price * (1 - (updatedProduct.discountParcentage || 0) / 100), // Return discounted price
            category: ((_a = updatedProduct.category) === null || _a === void 0 ? void 0 : _a.categoryName) || "",
            subcategory: ((_b = updatedProduct.subcategory) === null || _b === void 0 ? void 0 : _b.subCategoryName) || "",
            type: updatedProduct.type,
            status: updatedProduct.status,
            sustainability: updatedProduct.sustainability,
            rating: updatedProduct.rating,
            reviewCount: updatedProduct.reviewCount,
            popularity: updatedProduct.popularity,
            quantity: updatedProduct.quantity,
            inStock: updatedProduct.inStock,
            createdAt: updatedProduct.createdAt,
            isCustomizable: updatedProduct.isCustomizable,
            media: {
                images: updatedProduct.isCustomizable
                    ? Array.from(new Set(updatedProduct.colors.flatMap((color) => color.images)))
                    : updatedProduct.media.images,
                videos: updatedProduct.media.videos,
            },
            sizes: updatedProduct.sizes,
            colors: updatedProduct.colors.map((color) => ({
                name: color.name,
                hex: color.hex,
                images: color.images,
                _id: color._id,
            })),
            sku: updatedProduct.sku,
        };
        return sendResponse(res, 200, true, "Product updated successfully", responseProduct);
    }
    catch (error) {
        console.error("Error updating product:", error);
        // Clean up files
        if (req.files) {
            const files = Object.values(req.files).flat();
            yield Promise.all(files.map((file) => promises_1.default.unlink(file.path).catch(() => { })));
        }
        if (error.code === 11000) {
            return sendResponse(res, 409, false, "Product with this SKU or name already exists");
        }
        return sendResponse(res, 500, false, "Server error while updating product");
    }
});
exports.updateProduct = updateProduct;
// Delete Product
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return sendResponse(res, 400, false, "Invalid product ID");
        }
        const product = yield product_model_1.default.findById(id);
        if (!product) {
            return sendResponse(res, 404, false, "Product not found");
        }
        // Delete associated media from Cloudinary if non-customizable
        if (!product.isCustomizable) {
            const deletePromises = [
                ...product.media.images.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })),
                ...product.media.videos.map((url) => (0, deleteFromCloudinary_1.default)(url).catch(() => { })),
            ];
            yield Promise.all(deletePromises);
        }
        yield product_model_1.default.findByIdAndDelete(id);
        return sendResponse(res, 200, true, "Product deleted successfully", { id });
    }
    catch (error) {
        console.error("Error deleting product:", error);
        return sendResponse(res, 500, false, "Server error while deleting product");
    }
});
exports.deleteProduct = deleteProduct;
const getFilteredProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract query parameters
        const { category, // Category ID or name
        subcategory, // Subcategory ID or name
        minPrice, // Minimum price
        maxPrice, // Maximum price
        page = "1", // Pagination page
        limit = "20", // Items per page
        sortBy = "createdAt", // Sort field
        order = "desc" // Sort order (asc/desc)
         } = req.query;
        // Build query object
        const query = {};
        // Filter by category
        if (category) {
            let categoryDoc;
            // Check if category is an ID or name
            if (mongoose_1.default.Types.ObjectId.isValid(category)) {
                categoryDoc = yield category_model_1.default.findById(category);
            }
            else {
                categoryDoc = yield category_model_1.default.findOne({
                    categoryName: { $regex: new RegExp(category, "i") },
                });
            }
            if (!categoryDoc) {
                return sendResponse(res, 404, false, "Category not found");
            }
            query.category = categoryDoc._id;
        }
        // Filter by subcategory
        if (subcategory) {
            let subcategoryDoc;
            // Check if subcategory is an ID or name
            if (mongoose_1.default.Types.ObjectId.isValid(subcategory)) {
                subcategoryDoc = yield subCategory_model_1.default.findById(subcategory);
            }
            else {
                subcategoryDoc = yield subCategory_model_1.default.findOne({
                    subCategoryName: { $regex: new RegExp(subcategory, "i") },
                });
            }
            if (!subcategoryDoc) {
                return sendResponse(res, 404, false, "Subcategory not found");
            }
            // Validate subcategory belongs to category if both are provided
            if (query.category && subcategoryDoc.category.toString() !== query.category.toString()) {
                return sendResponse(res, 400, false, "Subcategory does not belong to the specified category");
            }
            query.subcategory = subcategoryDoc._id;
        }
        // Filter by price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) {
                const min = parseFloat(minPrice);
                if (isNaN(min) || min < 0) {
                    return sendResponse(res, 400, false, "Invalid minimum price");
                }
                query.price.$gte = min;
            }
            if (maxPrice) {
                const max = parseFloat(maxPrice);
                if (isNaN(max) || max < 0) {
                    return sendResponse(res, 400, false, "Invalid maximum price");
                }
                query.price.$lte = max;
            }
            // Validate minPrice is not greater than maxPrice
            if (minPrice && maxPrice && query.price.$gte > query.price.$lte) {
                return sendResponse(res, 400, false, "Minimum price cannot be greater than maximum price");
            }
        }
        // Pagination and sorting
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = order === "asc" ? 1 : -1;
        // Valid sort fields
        const validSortFields = [
            "createdAt",
            "price",
            "rating",
            "popularity",
            "name"
        ];
        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";
        // Create sort object
        const sortObject = { [sortField]: sortOrder };
        // Fetch products with pagination and populate category/subcategory
        const [products, total] = yield Promise.all([
            product_model_1.default.find(query)
                .populate({
                path: "category",
                select: "categoryName description",
            })
                .populate({
                path: "subcategory",
                select: "subCategoryName description",
            })
                .sort(sortObject)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            product_model_1.default.countDocuments(query),
        ]);
        // Format response
        const responseProducts = products.map((product) => {
            var _a, _b;
            return ({
                id: product._id,
                name: product.name,
                description: product.description,
                price: product.price,
                discountParcentage: product.discountParcentage,
                category: ((_a = product.category) === null || _a === void 0 ? void 0 : _a.categoryName) || "",
                subcategory: ((_b = product.subcategory) === null || _b === void 0 ? void 0 : _b.subCategoryName) || "",
                type: product.type,
                status: product.status,
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
            });
        });
        const response = {
            products: responseProducts,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            filtersApplied: {
                category: category || null,
                subcategory: subcategory || null,
                priceRange: {
                    min: minPrice ? parseFloat(minPrice) : null,
                    max: maxPrice ? parseFloat(maxPrice) : null,
                },
            },
        };
        return sendResponse(res, 200, true, "Products filtered successfully", response);
    }
    catch (error) {
        console.error("Error filtering products:", error);
        if (error instanceof mongoose_1.default.Error.CastError) {
            return sendResponse(res, 400, false, "Invalid ID format");
        }
        return sendResponse(res, 500, false, "Server error while filtering products");
    }
});
exports.getFilteredProducts = getFilteredProducts;
