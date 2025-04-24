"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const delivery_controller_1 = require("../controllers/delivery.controller");
const router = (0, express_1.Router)();
// Create delivery information
router.post("/create", delivery_controller_1.createDelivery);
// Get delivery by order ID
router.get("/order/:orderId", delivery_controller_1.getDeliveryByOrderId);
exports.default = router;
