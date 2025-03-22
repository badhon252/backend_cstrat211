import express, { Router } from "express";
import { createCategory } from "../controllers/category.controller";
import upload from "../utils/multer";

const router = Router();

router.route("/").post(upload.single("categoryImage"), createCategory);

export default router;
