"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const multer_1 = __importDefault(require("../utils/multer"));
const router = express_1.default.Router();
// Create a new order
router.post("/create", order_controller_1.createOrder);
// Get all orders
router.get("/getallorders", order_controller_1.getAllOrders);
// Get a single order by ID
router.get("/getallorders/:id", order_controller_1.getOrderById);
// Update order status
router.put("/update/:id", order_controller_1.updateOrderStatus);
// Delete order
router.delete("/delete/:id", order_controller_1.deleteOrder);
// Get order history for a user
router.get("/history/:userId", order_controller_1.getOrderHistory);
// Cancel an order
router.put("/order/:orderId/cancel", order_controller_1.cancelOrder);
// Route to get best selling products
router.get("/best-selling-products", order_controller_1.getBestSellingProducts);
// Customize product and create order
router.post("/customize-and-order", multer_1.default.fields([
    { name: "frontCustomizationPreview", maxCount: 1 },
    { name: "logoImage", maxCount: 1 },
]), order_controller_1.customizeProductAndCreateOrder);
exports.default = router;
