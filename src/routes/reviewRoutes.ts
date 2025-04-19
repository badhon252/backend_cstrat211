import express from "express";
import {
  createReview,
  getProductReviews,
  getAllReviews,
  updateReview,
  deleteReview
} from "../controllers/reviewController";


const router = express.Router();

// Create a review (customer only)
router.post("/products/:productId/reviews",  createReview as express.RequestHandler);

// Get all reviews for a product
router.get("/products/:productId/reviews", getProductReviews as express.RequestHandler);

// Get all reviews (admin only)
router.get("/allreviews", getAllReviews as express.RequestHandler);

// Update a review (only by the reviewer)
router.put("/reviews/:reviewId", updateReview as express.RequestHandler); ;

// Delete a review (only by the reviewer)
router.delete("/reviews/:reviewId", deleteReview as express.RequestHandler);;

export default router;