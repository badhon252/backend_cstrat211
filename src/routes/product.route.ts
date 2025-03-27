import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  deleteProductMedia,
} from "../controllers/product.controller";
import upload from "../utils/multer";

const router = express.Router();

// Create Product
router.post(
  "/create",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
  ]),
  createProduct
);

// Get All Products
router.get("/getallproducts", getAllProducts);

// Get Single Product
router.get("/getallproducts/:id", getProductById);

// Update Product
router.put(
  "/getallproducts/:id",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
  ]),
  updateProduct
);

// Delete Product
router.delete("/getallproducts/:id", deleteProduct);

// Delete Product Media
router.delete("/:id/media/:mediaType/:mediaUrl", deleteProductMedia);

export default router;