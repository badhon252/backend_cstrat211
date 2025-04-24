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
exports.rejectRefund = exports.approveRefund = exports.getAllRefunds = exports.createRefund = void 0;
const Refund_1 = __importDefault(require("../models/Refund"));
const order_model_1 = __importDefault(require("../models/order.model")); // Import the Order model
// Create a new refund request
const createRefund = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId, reason } = req.body;
        // Fetch the order details to get the total
        const order = yield order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ status: false, message: 'Order not found' });
        }
        const refund = new Refund_1.default({
            orderId,
            total: order.totalAmount, // Changed from order.total to order.totalAmount
            reason,
        });
        yield refund.save();
        res.status(201).json({ status: true, message: 'Refund request created successfully', refund });
    }
    catch (error) {
        res.status(500).json({ status: false, message: 'Error creating refund request', error });
    }
});
exports.createRefund = createRefund;
// Get all refund requests
const getAllRefunds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const refunds = yield Refund_1.default.find().populate('orderId');
        res.status(200).json({ status: true, message: 'Refund requests retrieved successfully', refunds });
    }
    catch (error) {
        res.status(500).json({ status: false, message: 'Error fetching refund requests', error });
    }
});
exports.getAllRefunds = getAllRefunds;
// Approve a refund request
const approveRefund = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refundId } = req.params;
        const refund = yield Refund_1.default.findByIdAndUpdate(refundId, { status: 'Approved', action: 'Approve' }, { new: true });
        if (!refund) {
            return res.status(404).json({ status: false, message: 'Refund request not found' });
        }
        res.status(200).json({ status: true, message: 'Refund request approved', refund });
    }
    catch (error) {
        res.status(500).json({ status: false, message: 'Error approving refund request', error });
    }
});
exports.approveRefund = approveRefund;
// Reject a refund request
const rejectRefund = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refundId } = req.params;
        const { reason } = req.body; // Get the reason from the request body
        // Find and update the refund request
        const refund = yield Refund_1.default.findByIdAndUpdate(refundId, { status: 'Rejected', action: 'Not Approve', reason }, // Update the reason
        { new: true } // Return the updated document
        );
        if (!refund) {
            return res.status(404).json({ status: false, message: 'Refund request not found' });
        }
        // Return the updated refund object in the response
        res.status(200).json({
            status: true,
            message: 'Refund request rejected',
            refund,
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: 'Error rejecting refund request', error });
    }
});
exports.rejectRefund = rejectRefund;
