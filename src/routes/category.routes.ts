import express, { Router } from "express";
import {
  createCategory,
  updateCategory,
} from "../controllers/category.controller";
import upload from "../utils/multer";

const router = Router();

router.route("/").post(upload.single("categoryImage"), createCategory);

router.route("/:id").put(upload.single("categoryImage"), updateCategory);

export default router;
