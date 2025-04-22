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
const order_model_1 = __importDefault(require("../models/order.model")); // Import your Order model
const user_model_1 = require("../models/user.model");
dotenv_1.default.config();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-03-31.basil',
});
const createPaymentSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, orderId } = req.body;
    // Validate required fields
    if (!userId || !orderId) {
        res.status(400).json({
            status: false,
            message: 'userId and orderId are required!'
        });
        return;
    }
    try {
        // Find the order in database
        const order = yield order_model_1.default.findById(orderId);
        if (!order) {
            res.status(404).json({
                status: false,
                message: 'Order not found'
            });
            return;
        }
        // Verify the order belongs to the user
        if (order.user.toString() !== userId) {
            res.status(403).json({
                status: false,
                message: 'This order does not belong to the specified user'
            });
            return;
        }
        // Check if order is already paid
        if (order.status === 'paid') {
            res.status(400).json({
                status: false,
                message: 'Order is already paid'
            });
            return;
        }
        const totalAmountInCents = Math.round(order.totalAmount * 100);
        // Validate FRONTEND_URL is set
        if (!process.env.FRONTEND_URL) {
            throw new Error('FRONTEND_URL environment variable is not set');
        }
        const successUrl = `${process.env.FRONTEND_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${process.env.FRONTEND_URL}/order/cancel`;
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Order #${orderId}`,
                            description: `Payment for order ${orderId}`,
                        },
                        unit_amount: totalAmountInCents,
                    },
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                orderId,
            },
        });
        // Save the payment session in the database
        const newPayment = new payment_model_1.default({
            userId,
            orderId,
            amount: order.totalAmount,
            stripeSessionId: session.id,
            paymentStatus: 'pending',
        });
        yield newPayment.save();
        res.status(200).json({
            status: true,
            message: 'Payment session created',
            url: session.url,
            sessionId: session.id,
            amount: order.totalAmount // Optional: include amount in response
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
            // Also update the order status to 'paid'
            yield order_model_1.default.findByIdAndUpdate(updatedPayment.orderId, { status: 'paid' });
            if (updatedPayment) {
                const user = yield user_model_1.User.findById(updatedPayment.userId);
                res.status(200).json({
                    status: true,
                    message: 'Payment successfully verified and completed',
                    paid: true,
                    payment: Object.assign(Object.assign({}, updatedPayment.toObject()), { userName: user === null || user === void 0 ? void 0 : user.name, userPhone: user === null || user === void 0 ? void 0 : user.phone })
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
//get all Payment successfully verified and completed in response show details
const getAllPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payments = yield payment_model_1.default.find({ paymentStatus: 'completed' }).lean();
        // Extract all userIds and orderIds from payments
        const userIds = payments.map(p => p.userId);
        const orderIds = payments.map(p => p.orderId);
        // Fetch users and orders in bulk (correct field: 'phone')
        const users = yield user_model_1.User.find({ _id: { $in: userIds } }).select('name phone').lean();
        const orders = yield order_model_1.default.find({ _id: { $in: orderIds } }).select('status orderSlug').lean(); // Include 'orderSlug' here
        // Convert to maps for quick lookup
        const userMap = users.reduce((map, user) => {
            map[user._id.toString()] = {
                name: user.name || '',
                phone: user.phone || null // Use 'phone' (not 'phonel')
            };
            return map;
        }, {});
        const orderMap = orders.reduce((map, order) => {
            map[order._id.toString()] = {
                status: order.status || null,
                orderSlug: order.orderSlug || null // Include 'orderSlug' in the map
            };
            return map;
        }, {});
        // Enhance payments with additional fields
        const enhancedPayments = payments.map(payment => {
            var _a, _b, _c, _d;
            const orderId = payment.orderId.toString();
            const userId = payment.userId.toString();
            return Object.assign(Object.assign({}, payment), { name: ((_a = userMap[userId]) === null || _a === void 0 ? void 0 : _a.name) || null, phone: ((_b = userMap[userId]) === null || _b === void 0 ? void 0 : _b.phone) || null, status: ((_c = orderMap[orderId]) === null || _c === void 0 ? void 0 : _c.status) || null, orderSlug: ((_d = orderMap[orderId]) === null || _d === void 0 ? void 0 : _d.orderSlug) || null });
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
