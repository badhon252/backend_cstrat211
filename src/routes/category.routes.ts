import express, { Router } from "express";
import { createCategory } from "../controllers/category.controller";

const router = Router();

router.route("/").post(createCategory);

export default router;
