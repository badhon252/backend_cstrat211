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
exports.deleteSubCategory = exports.getAllSubCategories = exports.getSubCategoryById = exports.updateSubCategory = exports.createSubCategory = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const subCategory_model_1 = __importDefault(require("../models/subCategory.model"));
const category_model_1 = __importDefault(require("../models/category.model"));
// @desc    Create new SubCategory
// @route   POST /api/v1/subcategories
const createSubCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subCategoryName, description, category, stock, sales } = req.body;
        if (!subCategoryName || !category) {
            res.status(400).json({
                status: false,
                message: "subCategory name and category are required",
            });
            return;
        }
        const existing = yield subCategory_model_1.default.findOne({ subCategoryName });
        if (existing) {
            res.status(409).json({
                status: false,
                message: "subCategory with this name already exists",
            });
            return;
        }
        const subCategory = yield subCategory_model_1.default.create({
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
    }
    catch (error) {
        res
            .status(500)
            .json({ status: false, message: "server error", data: error });
        return;
    }
});
exports.createSubCategory = createSubCategory;
// @desc    Update SubCategory
// @route   PUT /api/v1/subcategories/:id
const updateSubCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ status: false, message: "invalid id" });
            return;
        }
        const subCategory = yield subCategory_model_1.default.findById(id);
        if (!subCategory) {
            res.status(404).json({ status: false, message: "subCategory not found" });
            return;
        }
        const { subCategoryName, description, category, stock, sales } = req.body;
        if (subCategoryName)
            subCategory.subCategoryName = subCategoryName;
        if (description)
            subCategory.description = description;
        if (category)
            subCategory.category = category;
        if (stock !== undefined)
            subCategory.stock = stock;
        if (sales !== undefined)
            subCategory.sales = sales;
        const updated = yield subCategory.save();
        res.status(200).json({
            status: true,
            message: "sub category update successfully",
            updated,
        });
    }
    catch (error) {
        res.status(500).json({ message: "server error", error });
        return;
    }
});
exports.updateSubCategory = updateSubCategory;
// @desc    Get single SubCategory
// @route   GET /api/v1/subcategories/:id
const getSubCategoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ status: false, message: "invalid id" });
            return;
        }
        const subCategory = yield subCategory_model_1.default.findById(id).populate("category");
        if (!subCategory) {
            res.status(404).json({ status: false, message: "subCategory not found" });
            return;
        }
        res.status(200).json({
            status: true,
            message: "individual sub category found successfully",
            subCategory,
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "server error", error });
        return;
    }
});
exports.getSubCategoryById = getSubCategoryById;
// @desc    Get all SubCategories
// @route   GET /api/v1/subcategories
const getAllSubCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = "1", limit = "10", sortBy = "createdAt", order = "desc", subCategoryName, categoryName, salesMin, salesMax, stockMin, stockMax, startDate, endDate, } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = {};
        if (subCategoryName) {
            filter.subCategoryName = {
                $regex: subCategoryName,
                $options: "i",
            };
        }
        if (salesMin || salesMax) {
            filter.sales = {};
            if (salesMin)
                filter.sales.$gte = parseInt(salesMin);
            if (salesMax)
                filter.sales.$lte = parseInt(salesMax);
        }
        if (stockMin || stockMax) {
            filter.stock = {};
            if (stockMin)
                filter.stock.$gte = parseInt(stockMin);
            if (stockMax)
                filter.stock.$lte = parseInt(stockMax);
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        if (categoryName) {
            const matchingCategories = yield category_model_1.default.find({
                categoryName: { $regex: categoryName, $options: "i" },
            });
            const categoryIds = matchingCategories.map((cat) => cat._id);
            filter.category = { $in: categoryIds };
        }
        const total = yield subCategory_model_1.default.countDocuments(filter);
        const subCategories = yield subCategory_model_1.default.find(filter)
            .populate("category")
            .sort({ [sortBy]: sortOrder })
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
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "server error",
            error,
        });
        return;
    }
});
exports.getAllSubCategories = getAllSubCategories;
// @desc    Delete SubCategory
// @route   DELETE /api/v1/subcategories/:id
const deleteSubCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ status: false, message: "invalid ID" });
            return;
        }
        const subCategory = yield subCategory_model_1.default.findById(id);
        if (!subCategory) {
            res.status(404).json({ status: false, message: "subCategory not found" });
            return;
        }
        yield subCategory.deleteOne();
        res
            .status(200)
            .json({ status: true, message: "subCategory deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "server error", error });
        return;
    }
});
exports.deleteSubCategory = deleteSubCategory;
