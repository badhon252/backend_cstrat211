import express, { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller";
import upload from "../utils/multer";

const router = Router();

router
  .route("/")
  .post(upload.single("categoryImage"), createCategory)
  .get(getAllCategories);

router
  .route("/:id")
  .put(upload.single("categoryImage"), updateCategory)
  .get(getCategoryById);

export default router;
