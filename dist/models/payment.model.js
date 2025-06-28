"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const paymentSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderId: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        }],
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    stripeSessionId: {
        type: String,
        required: true,
        unique: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
    },
}, { timestamps: true });
const Payment = mongoose_1.default.model("Payment", paymentSchema);
exports.default = Payment;
