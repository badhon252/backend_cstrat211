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
exports.deleteCategory = exports.getCategoryById = exports.getAllCategories = exports.updateCategory = exports.createCategory = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const category_model_1 = __importDefault(require("../models/category.model"));
const cloudinary_1 = require("../utils/cloudinary");
const deleteFromCloudinary_1 = __importDefault(require("../utils/deleteFromCloudinary"));
// create category
const createCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoryName, description, sales } = req.body;
        if (!categoryName) {
            res
                .status(400)
                .json({ status: false, message: "category name is required" });
            return;
        }
        const existingCategory = yield category_model_1.default.findOne({ categoryName });
        if (existingCategory) {
            res
                .status(409)
                .json({ status: false, message: "category already exists" });
            return;
        }
        let imageUrl;
        if (req.file) {
            imageUrl = yield (0, cloudinary_1.uploadToCloudinary)(req.file.path);
        }
        const newCategory = new category_model_1.default(Object.assign(Object.assign({ categoryName,
            description }, (imageUrl && { categoryImage: imageUrl })), { sales }));
        yield newCategory.save();
        res.status(201).json({
            status: true,
            message: "new category created successfully",
            data: newCategory,
        });
    }
    catch (error) {
        if (error instanceof mongoose_1.default.Error.ValidationError) {
            res.status(400).json({ status: false, message: error.message });
            return;
        }
        if (error instanceof Error &&
            "code" in error &&
            error.code === 11000) {
            res
                .status(409)
                .json({ status: false, message: "category name already exists" });
            return;
        }
        res.status(500).json({ status: false, message: "Server error" });
        return;
    }
});
exports.createCategory = createCategory;
// update category
const updateCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { categoryName, description } = req.body;
        const category = yield category_model_1.default.findById(id);
        if (!category) {
            res.status(404).json({ status: false, message: "category not found" });
            return;
        }
        if (categoryName) {
            const existingCategory = yield category_model_1.default.findOne({
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
            const imageUrl = yield (0, cloudinary_1.uploadToCloudinary)(req.file.path);
            category.categoryImage = imageUrl;
        }
        yield category.save();
        res.status(200).json({
            status: true,
            message: "category updated successfully",
            data: category,
        });
        return;
    }
    catch (error) {
        if (error instanceof mongoose_1.default.Error.ValidationError) {
            res.status(400).json({ status: false, message: error.message });
            return;
        }
        if (error instanceof Error &&
            "code" in error &&
            error.code === 11000) {
            res.status(409).json({
                status: false,
                message: "category name already exists",
            });
            return;
        }
        res.status(500).json({ status: false, message: "server error" });
        return;
    }
});
exports.updateCategory = updateCategory;
// get all categories
const getAllCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = "1", limit = "10", search, sales } = req.query;
        const pageNumber = Math.max(1, parseInt(page)) || 1;
        const limitNumber = Math.max(1, Math.min(100, parseInt(limit))) || 10;
        const skip = (pageNumber - 1) * limitNumber;
        const filter = {};
        if (search) {
            filter.categoryName = {
                $regex: search,
                $options: "i",
            };
        }
        if (sales) {
            if (sales === "true") {
                filter.sales = { $gt: 0 };
            }
            else if (!isNaN(Number(sales))) {
                filter.sales = { $gte: Number(sales) };
            }
        }
        // Using aggregation for better performance
        const aggregationPipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "subcategories", // assuming your subcategory collection name
                    localField: "_id",
                    foreignField: "category",
                    as: "subcategories"
                }
            },
            {
                $lookup: {
                    from: "products",
                    let: { categoryId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ["$category", "$$categoryId"] },
                                        { $in: ["$subcategory", { $ifNull: ["$subcategories._id", []] }] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "products"
                }
            },
            // Calculate total stock from all products
            {
                $addFields: {
                    stock: { $sum: "$products.quantity" }
                }
            },
            // Lookup completed payments to calculate sales
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
                                as: "product"
                            }
                        },
                        { $unwind: "$product" },
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ["$product.category", "$$categoryId"] },
                                        { $in: ["$product.subcategory", { $ifNull: ["$subcategories._id", []] }] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalSales: { $sum: "$amount" }, // sum of payment amounts
                                totalQuantity: { $sum: "$order.products.quantity" } // sum of product quantities
                            }
                        }
                    ],
                    as: "salesData"
                }
            },
            // Add calculated sales fields
            {
                $addFields: {
                    salesAmount: { $ifNull: [{ $arrayElemAt: ["$salesData.totalSales", 0] }, 0] },
                    salesQuantity: { $ifNull: [{ $arrayElemAt: ["$salesData.totalQuantity", 0] }, 0] }
                }
            },
            // Project only the fields we want
            {
                $project: {
                    categoryName: 1,
                    description: 1,
                    categoryImage: 1,
                    stock: 1,
                    sales: "$salesAmount", // or "$salesQuantity" depending on what you want to show
                    createdAt: 1,
                    updatedAt: 1,
                    __v: 1
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNumber }
        ];
        // Get total count for pagination
        const totalPromise = category_model_1.default.countDocuments(filter);
        // Get aggregated categories
        const categoriesPromise = category_model_1.default.aggregate(aggregationPipeline);
        const [total, categories] = yield Promise.all([totalPromise, categoriesPromise]);
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
    }
    catch (error) {
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
});
exports.getAllCategories = getAllCategories;
// get a single category by id
const getCategoryById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const category = yield category_model_1.default.findById(id);
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
    }
    catch (error) {
        if (error instanceof mongoose_1.default.Error.CastError) {
            res.status(400).json({ status: false, message: "invalid category id" });
            return;
        }
        res.status(500).json({ status: false, message: "server error" });
        return;
    }
});
exports.getCategoryById = getCategoryById;
// delete category
const deleteCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedCategory = yield category_model_1.default.findByIdAndDelete(id);
        if (!deletedCategory) {
            res.status(404).json({
                status: false,
                message: "category not found",
            });
            return;
        }
        if (deletedCategory.categoryImage) {
            yield (0, deleteFromCloudinary_1.default)(deletedCategory.categoryImage);
        }
        res.status(200).json({
            status: true,
            message: "category deleted successfully",
            data: deletedCategory,
        });
        return;
    }
    catch (error) {
        if (error instanceof mongoose_1.default.Error.CastError) {
            if (error instanceof mongoose_1.default.Error.CastError) {
                res.status(400).json({ status: false, message: "invalid category id" });
                return;
            }
            res.status(500).json({ status: false, message: "server error" });
            return;
        }
    }
});
exports.deleteCategory = deleteCategory;
