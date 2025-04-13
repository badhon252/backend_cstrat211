import express from "express";
import { 
  createOrder, 
  getAllOrders, 
  getOrderById,
  updateOrderStatus,
  deleteOrder 
} from "../controllers/order.controller";

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

export default router;