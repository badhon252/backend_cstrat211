"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPayments = exports.verifyPayment = exports.createPaymentSession = void 0;
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
const payment_model_1 = __importDefault(require("../models/payment.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const user_model_1 = require("../models/user.model");
dotenv_1.default.config();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-03-31.basil',
});
const createPaymentSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, orderId } = req.body;
    if (!userId || !orderId || !Array.isArray(orderId)) {
        res.status(400).json({
            status: false,
            message: 'userId and orderId (array) are required!'
        });
        return;
    }
    try {
        const orders = yield order_model_1.default.find({
            _id: { $in: orderId },
            user: userId,
            status: { $in: ['pending', 'processing'] }
        });
        if (!orders.length) {
            res.status(404).json({
                status: false,
                message: 'No valid orders found for payment'
            });
            return;
        }
        const paidOrders = orders.filter(order => order.status === 'paid');
        if (paidOrders.length > 0) {
            res.status(400).json({
                status: false,
                message: 'Some orders are already paid',
                paidOrderId: paidOrders.map(order => order._id)
            });
            return;
        }
        const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalAmountInCents = Math.round(totalAmount * 100);
        if (!process.env.FRONTEND_URL) {
            throw new Error('FRONTEND_URL environment variable is not set');
        }
        const successUrl = `${process.env.FRONTEND_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${process.env.FRONTEND_URL}/order/cancel`;
        const lineItems = orders.map(order => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `Order #${order.orderSlug}`,
                    description: `Payment for order ${order.orderSlug}`,
                },
                unit_amount: Math.round(order.totalAmount * 100),
            },
            quantity: 1,
        }));
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                orderId: JSON.stringify(orderId),
            },
        });
        yield order_model_1.default.updateMany({ _id: { $in: orderId } }, { $set: { paymentSessionId: session.id } });
        const newPayment = new payment_model_1.default({
            userId,
            orderId,
            amount: totalAmount,
            stripeSessionId: session.id,
            paymentStatus: 'pending',
        });
        yield newPayment.save();
        res.status(200).json({
            status: true,
            message: 'Payment session created for multiple orders',
            url: session.url,
            sessionId: session.id,
            amount: totalAmount,
            orderCount: orders.length
        });
    }
    catch (error) {
        console.error('Payment session creation error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to create payment session',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.createPaymentSession = createPaymentSession;
const verifyPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { sessionId } = req.params;
    if (!sessionId) {
        res.status(400).json({
            status: false,
            message: 'Session ID is required',
        });
        return;
    }
    try {
        const session = yield stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
            // Update payment status in database
            const updatedPayment = yield payment_model_1.default.findOneAndUpdate({ stripeSessionId: sessionId }, { paymentStatus: 'completed' }, { new: true });
            if (!updatedPayment) {
                res.status(404).json({
                    status: false,
                    message: 'Payment verification failed: Record not found',
                });
                return;
            }
            // Parse order IDs from metadata
            const orderId = ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.orderId) ? JSON.parse(session.metadata.orderId) : [];
            // Update all orders status to 'paid'
            yield order_model_1.default.updateMany({ _id: { $in: orderId } }, { $set: { status: 'paid' } });
            if (updatedPayment) {
                const user = yield user_model_1.User.findById(updatedPayment.userId);
                res.status(200).json({
                    status: true,
                    message: 'Payment successfully verified and completed for all orders',
                    paid: true,
                    payment: Object.assign(Object.assign({}, updatedPayment.toObject()), { userName: user === null || user === void 0 ? void 0 : user.name, userPhone: user === null || user === void 0 ? void 0 : user.phone, orderCount: orderId.length })
                });
            }
        }
        else {
            res.status(200).json({
                status: true,
                message: `Payment is ${session.payment_status}`,
                paid: false,
                paymentStatus: session.payment_status
            });
        }
    }
    catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            status: false,
            message: 'Payment verification failed: Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.verifyPayment = verifyPayment;
const getAllPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payments = yield payment_model_1.default.find().lean().sort({ createdAt: -1 });
        // Extract all userIds and flatten all orderIds from payments
        const userIds = payments.map(p => p.userId);
        const allOrderId = payments.flatMap(p => p.orderId || []);
        // Fetch users and orders in bulk
        const users = yield user_model_1.User.find({ _id: { $in: userIds } }).select('name phone').lean();
        const orders = yield order_model_1.default.find({ _id: { $in: allOrderId } }).select('status orderSlug').lean();
        // Convert to maps for quick lookup
        const userMap = users.reduce((map, user) => {
            map[user._id.toString()] = {
                name: user.name || '',
                phone: user.phone || null
            };
            return map;
        }, {});
        const orderMap = orders.reduce((map, order) => {
            map[order._id.toString()] = {
                status: order.status || null,
                orderSlug: order.orderSlug || null
            };
            return map;
        }, {});
        // Enhance payments with additional fields
        const enhancedPayments = payments.map(payment => {
            var _a, _b, _c;
            const userId = payment.userId.toString();
            const orderDetails = (payment.orderId || []).map(orderId => {
                var _a, _b;
                return ({
                    orderId: orderId.toString(),
                    status: ((_a = orderMap[orderId.toString()]) === null || _a === void 0 ? void 0 : _a.status) || null,
                    orderSlug: ((_b = orderMap[orderId.toString()]) === null || _b === void 0 ? void 0 : _b.orderSlug) || null,
                });
            });
            return Object.assign(Object.assign({}, payment), { name: ((_a = userMap[userId]) === null || _a === void 0 ? void 0 : _a.name) || null, phone: ((_b = userMap[userId]) === null || _b === void 0 ? void 0 : _b.phone) || null, orderDetails, orderCount: ((_c = payment.orderId) === null || _c === void 0 ? void 0 : _c.length) || 0 });
        });
        res.status(200).json({
            status: true,
            message: 'All payments fetched successfully',
            payments: enhancedPayments,
        });
    }
    catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to fetch payments',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.getAllPayments = getAllPayments;
