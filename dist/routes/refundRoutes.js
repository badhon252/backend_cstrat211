"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/refundRoutes.ts
const express_1 = require("express");
const RefundController_1 = require("../controllers/RefundController");
const router = (0, express_1.Router)();
// Create a new refund request
router.post('/refunds', RefundController_1.createRefund);
// Get all refund requests
router.get('/refunds', RefundController_1.getAllRefunds);
// Approve a refund request
router.put('/refunds/:refundId/approve', RefundController_1.approveRefund);
;
// Reject a refund request
router.put('/refunds/:refundId/reject', RefundController_1.rejectRefund);
exports.default = router;
