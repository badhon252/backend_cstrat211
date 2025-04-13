import express from 'express';
import { createPaymentSession, verifyPayment,getAllPayments } from '../controllers/payment.controller';

const router = express.Router();

router.post('/createpayment', createPaymentSession as express.RequestHandler);
router.get('/verify/:sessionId', verifyPayment as express.RequestHandler);
router.get('/getAllPayment', getAllPayments as express.RequestHandler);

export default router;