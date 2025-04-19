import express from "express";
import { 
  createOrder, 
  getAllOrders, 
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrderHistory,
  cancelOrder,
  getBestSellingProducts,
  customizeProductAndCreateOrder,
  
} from "../controllers/order.controller";

import upload from "../utils/multer";

const router = express.Router();

// Create a new order
router.post("/create", createOrder as express.RequestHandler);

// Get all orders
router.get("/getallorders", getAllOrders as express.RequestHandler);

// Get a single order by ID
router.get("/getallorders/:id", getOrderById as express.RequestHandler);

// Update order status
router.put("/update/:id", updateOrderStatus as express.RequestHandler);

// Delete order
router.delete("/delete/:id", deleteOrder as express.RequestHandler);

// Get order history for a user
router.get("/history/:userId", getOrderHistory as express.RequestHandler);

// Cancel an order
router.put("/order/:orderId/cancel", cancelOrder as express.RequestHandler);

// Route to get best selling products
router.get("/best-selling-products", getBestSellingProducts as express.RequestHandler);

// Customize product and create order
router.post(
  "/customize-and-order",
  upload.fields([
    { name: "frontCustomizationPreview", maxCount: 1 },
    { name: "logoImage", maxCount: 1 },
  ]),
  customizeProductAndCreateOrder as express.RequestHandler
);

export default router;