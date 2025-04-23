import mongoose from "mongoose";

export interface IPayment extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId[];
  amount: number;
  stripeSessionId: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema<IPayment>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: [{
      type: mongoose.Schema.Types.ObjectId,
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
  },
  { timestamps: true }
);

const Payment = mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;