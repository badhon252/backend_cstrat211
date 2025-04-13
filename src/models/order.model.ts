import mongoose from "mongoose";
import { IUser } from "./user.model";
import { IProduct } from "./product.model";

export interface IOrder extends mongoose.Document {
  user: mongoose.Types.ObjectId | IUser; // Reference to the user who made the order
  products: {
    product: mongoose.Types.ObjectId | IProduct; // Reference to the product
    quantity: number; // Quantity of the product ordered
    price: number; // Price of the product at the time of order
  }[];
  totalAmount: number; // Total amount of the order
  status: "pending" | "processing" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
}

const orderSchema = new mongoose.Schema<IOrder>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
