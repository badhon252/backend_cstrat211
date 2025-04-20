import { Request, Response } from "express";
import Review from "../models/Review";
import Product from "../models/product.model";
import {User} from "../models/user.model";

// Create a new review
export const createReview = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { userId, rating, review, images } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if user exists and is a customer
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user?.role !== "customer") {
      return res.status(403).json({ message: "Only customers can leave reviews" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({ user: userId, product: productId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    // Create new review
    const newReview = new Review({
      user: userId,
      product: productId,
      rating,
      review,
      images
    });

    await newReview.save();

    // Update product rating stats
    await updateProductRating(productId);

    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get all reviews for a product
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product: productId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: true,
      message: "Reviews fetched successfully",
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server error",
      error,
    });
  }
};

// Get all reviews from the database
export const getAllReviews = async (req: Request, res: Response) => {
    try {
      const reviews = await Review.find()
        .populate("user", "name avatar")
        .populate("product", "name price images")
        .sort({ createdAt: -1 });
  
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  };

// Update a review
export const updateReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { userId, rating, review, images } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const existingReview = await Review.findOne({ _id: reviewId, user: userId });
    if (!existingReview) {
      return res.status(404).json({ message: "Review not found or unauthorized" });
    }

    existingReview.rating = rating || existingReview.rating;
    existingReview.review = review || existingReview.review;
    existingReview.images = images || existingReview.images;

    await existingReview.save();

    // Update product rating stats
    await updateProductRating(existingReview.product.toString());

    res.json(existingReview);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Delete a review
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const review = await Review.findOneAndDelete({ _id: reviewId, user: userId });
    if (!review) {
      return res.status(404).json({ message: "Review not found or unauthorized" });
    }

    // Update product rating stats
    await updateProductRating(review.product.toString());

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Helper function to update product rating stats
const updateProductRating = async (productId: string) => {
  const reviews = await Review.find({ product: productId });
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    const reviewCount = reviews.length;

    await Product.findByIdAndUpdate(productId, {
      rating: parseFloat(averageRating.toFixed(1)),
      reviewCount
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
      reviewCount: 0
    });
  }
};