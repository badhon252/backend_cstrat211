import mongoose, { Document, Schema } from 'mongoose';

interface PaymentDocument extends Document {
  userId: string;
  orderId: string;
  amount: number;
  stripeSessionId: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    userId: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
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
  },
  { timestamps: true }
);

const Payment = mongoose.model<PaymentDocument>('Payment', paymentSchema);

export default Payment;