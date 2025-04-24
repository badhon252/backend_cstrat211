"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const multer_1 = __importDefault(require("../utils/multer"));
const isLoggedIn_1 = require("../middlewares/isLoggedIn");
const checkAdmin_1 = require("../middlewares/checkAdmin");
const router = (0, express_1.Router)();
router
    .route("/")
    .post(isLoggedIn_1.isLoggedIn, checkAdmin_1.checkAdmin, multer_1.default.single("categoryImage"), category_controller_1.createCategory)
    .get(category_controller_1.getAllCategories);
router
    .route("/:id")
    .put(isLoggedIn_1.isLoggedIn, checkAdmin_1.checkAdmin, multer_1.default.single("categoryImage"), category_controller_1.updateCategory)
    .get(category_controller_1.getCategoryById)
    .delete(isLoggedIn_1.isLoggedIn, checkAdmin_1.checkAdmin, category_controller_1.deleteCategory);
exports.default = router;
