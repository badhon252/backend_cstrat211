// routes/refundRoutes.ts
import { Router } from 'express';
import {
  createRefund,
  getAllRefunds,
  approveRefund,
  rejectRefund,
} from '../controllers/RefundController';

const router = Router();

// Create a new refund request
router.post('/refunds', createRefund as any);

// Get all refund requests
router.get('/refunds', getAllRefunds);

// Approve a refund request
router.put('/refunds/:refundId/approve', approveRefund as any); ;

// Reject a refund request
router.put('/refunds/:refundId/reject', rejectRefund as any);

export default router;