import { Router } from "express";
import { isLoggedIn } from "../middlewares/isLoggedIn";
import { checkAdmin } from "../middlewares/checkAdmin";
import {
  createSubCategory,
  deleteSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
} from "../controllers/subCategory.controller";

const router = Router();

router
  .route("/")
  .post(isLoggedIn, checkAdmin, createSubCategory)
  .get(getAllSubCategories);

router
  .route("/:id")
  .put(isLoggedIn, checkAdmin, updateSubCategory)
  .get(getSubCategoryById)
  .delete(isLoggedIn, checkAdmin, deleteSubCategory);

export default router;
