"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// models/Refund.ts
const mongoose_1 = require("mongoose");
const RefundSchema = new mongoose_1.Schema({
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order', // Reference to the Order model
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    date: {
        type: Date,
        default: Date.now,
    },
    reason: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        enum: ['Cancel', 'Approve', 'Not Approve'],
        default: 'Cancel',
    },
});
exports.default = (0, mongoose_1.model)('Refund', RefundSchema);
