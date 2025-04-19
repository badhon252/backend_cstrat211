// models/Refund.ts
import { Schema, model, Document } from 'mongoose';

export interface IRefund extends Document {
  orderId: Schema.Types.ObjectId; // Reference to the Order model
  total: number; // Total amount to be refunded
  status: 'Pending' | 'Approved' | 'Rejected'; // Refund status
  date: Date; // Date of refund request
  reason: string; // Reason for refund
  action: 'Cancel' | 'Approve' | 'Not Approve'; // Action taken on refund
}

const RefundSchema = new Schema<IRefund>({
  orderId: {
    type: Schema.Types.ObjectId,
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

export default model<IRefund>('Refund', RefundSchema);