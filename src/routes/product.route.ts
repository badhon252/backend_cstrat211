import express from "express";
import {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import upload from "../utils/multer";

const router = express.Router();

// Create Product
router.post(
  "/create",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
    { name: "colorImages[0]", maxCount: 10 },
    { name: "colorImages[1]", maxCount: 10 },
  ]),
  createProduct
);

// Get All Products
router.get("/getallproducts", getAllProducts);

// Get Product by ID
router.get("/getallproducts/:id", getSingleProduct);

// Update Product
router.put(
  "/updateProduct/:id",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
    { name: "colorImages[0]", maxCount: 10 },
    { name: "colorImages[1]", maxCount: 10 },
  ]),
  updateProduct
);

// Delete Product
router.delete("/deleteproduct/:id", deleteProduct);

export default router;
