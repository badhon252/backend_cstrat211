"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const isLoggedIn_1 = require("../middlewares/isLoggedIn");
const checkAdmin_1 = require("../middlewares/checkAdmin");
const subCategory_controller_1 = require("../controllers/subCategory.controller");
const router = (0, express_1.Router)();
router
    .route("/")
    .post(isLoggedIn_1.isLoggedIn, checkAdmin_1.checkAdmin, subCategory_controller_1.createSubCategory)
    .get(subCategory_controller_1.getAllSubCategories);
router
    .route("/:id")
    .put(isLoggedIn_1.isLoggedIn, checkAdmin_1.checkAdmin, subCategory_controller_1.updateSubCategory)
    .get(subCategory_controller_1.getSubCategoryById)
    .delete(isLoggedIn_1.isLoggedIn, checkAdmin_1.checkAdmin, subCategory_controller_1.deleteSubCategory);
exports.default = router;
