import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller";
import upload from "../utils/multer";
import { isLoggedIn } from "../middlewares/isLoggedIn";
import { checkAdmin } from "../middlewares/checkAdmin";

const router = Router();

router
  .route("/")
  .post(isLoggedIn, checkAdmin, upload.single("categoryImage"), createCategory)
  .get(getAllCategories);

router
  .route("/:id")
  .put(isLoggedIn, checkAdmin, upload.single("categoryImage"), updateCategory)
  .get(getCategoryById)
  .delete(isLoggedIn, checkAdmin, deleteCategory);

export default router;
