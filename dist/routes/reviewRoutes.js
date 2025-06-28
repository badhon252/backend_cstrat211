"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewController_1 = require("../controllers/reviewController");
const router = express_1.default.Router();
// Create a review (customer only)
router.post("/products/:productId/reviews", reviewController_1.createReview);
// Get all reviews for a product
router.get("/products/:productId/reviews", reviewController_1.getProductReviews);
// Get all reviews (admin only)
router.get("/allreviews", reviewController_1.getAllReviews);
// Update a review (only by the reviewer)
router.put("/reviews/:reviewId", reviewController_1.updateReview);
;
// Delete a review (only by the reviewer)
router.delete("/reviews/:reviewId", reviewController_1.deleteReview);
;
exports.default = router;
