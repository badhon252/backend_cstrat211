"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const product_controller_1 = require("../controllers/product.controller");
const multer_1 = __importDefault(require("../utils/multer"));
const router = express_1.default.Router();
// Create Product
router.post("/create", multer_1.default.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
    { name: "colorImages[0]", maxCount: 10 },
    { name: "colorImages[1]", maxCount: 10 },
]), product_controller_1.createProduct);
// Get All Products
router.get("/getallproducts", product_controller_1.getAllProducts);
// Get Product by ID
router.get("/getallproducts/:id", product_controller_1.getSingleProduct);
// Update Product
router.put("/updateProduct/:id", multer_1.default.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
    { name: "colorImages[0]", maxCount: 10 },
    { name: "colorImages[1]", maxCount: 10 },
]), product_controller_1.updateProduct);
// Delete Product
router.delete("/deleteproduct/:id", product_controller_1.deleteProduct);
// Get Products by Category
// In your routes file
router.get('/filter', product_controller_1.getFilteredProducts);
exports.default = router;
