import express, { RequestHandler, Router } from "express";
import { 
  createDelivery,
  getDeliveryByOrderId,
  updateDeliveryStatus
} from '../controllers/delivery.controller';

const router = Router();

// Create delivery information
router.post("/create", createDelivery as RequestHandler);

// Get delivery by order ID
router.get("/order/:orderId", getDeliveryByOrderId as RequestHandler);

// Update delivery status
router.put('/status/:deliveryId', updateDeliveryStatus as RequestHandler);

export default router;