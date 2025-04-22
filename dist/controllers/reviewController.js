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
exports.deleteReview = exports.updateReview = exports.getAllReviews = exports.getProductReviews = exports.createReview = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const product_model_1 = __importDefault(require("../models/product.model"));
const user_model_1 = require("../models/user.model");
// Create a new review
const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { userId, rating, review, images } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        // Check if user exists and is a customer
        const user = yield user_model_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if ((user === null || user === void 0 ? void 0 : user.role) !== "customer") {
            return res.status(403).json({ message: "Only customers can leave reviews" });
        }
        // Check if product exists
        const product = yield product_model_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Check if user has already reviewed this product
        const existingReview = yield Review_1.default.findOne({ user: userId, product: productId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this product" });
        }
        // Create new review
        const newReview = new Review_1.default({
            user: userId,
            product: productId,
            rating,
            review,
            images
        });
        yield newReview.save();
        // Update product rating stats
        yield updateProductRating(productId);
        res.status(201).json(newReview);
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.createReview = createReview;
// Get all reviews for a product
const getProductReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const reviews = yield Review_1.default.find({ product: productId })
            .populate("user", "name avatar")
            .sort({ createdAt: -1 });
        res.status(200).json({
            status: true,
            message: "Reviews fetched successfully",
            data: reviews,
        });
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "Server error",
            error,
        });
    }
});
exports.getProductReviews = getProductReviews;
// Get all reviews from the database
const getAllReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reviews = yield Review_1.default.find()
            .populate("user", "name avatar")
            .populate("product", "name price images")
            .sort({ createdAt: -1 });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.getAllReviews = getAllReviews;
// Update a review
const updateReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reviewId } = req.params;
        const { userId, rating, review, images } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const existingReview = yield Review_1.default.findOne({ _id: reviewId, user: userId });
        if (!existingReview) {
            return res.status(404).json({ message: "Review not found or unauthorized" });
        }
        existingReview.rating = rating || existingReview.rating;
        existingReview.review = review || existingReview.review;
        existingReview.images = images || existingReview.images;
        yield existingReview.save();
        // Update product rating stats
        yield updateProductRating(existingReview.product.toString());
        res.json(existingReview);
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.updateReview = updateReview;
// Delete a review
const deleteReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reviewId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const review = yield Review_1.default.findOneAndDelete({ _id: reviewId, user: userId });
        if (!review) {
            return res.status(404).json({ message: "Review not found or unauthorized" });
        }
        // Update product rating stats
        yield updateProductRating(review.product.toString());
        res.json({ message: "Review deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.deleteReview = deleteReview;
// Helper function to update product rating stats
const updateProductRating = (productId) => __awaiter(void 0, void 0, void 0, function* () {
    const reviews = yield Review_1.default.find({ product: productId });
    if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        const reviewCount = reviews.length;
        yield product_model_1.default.findByIdAndUpdate(productId, {
            rating: parseFloat(averageRating.toFixed(1)),
            reviewCount
        });
    }
    else {
        yield product_model_1.default.findByIdAndUpdate(productId, {
            rating: 0,
            reviewCount: 0
        });
    }
});
