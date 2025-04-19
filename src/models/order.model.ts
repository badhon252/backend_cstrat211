import mongoose from "mongoose";
import { IUser } from "./user.model";
import { IProduct } from "./product.model";
import { IDelivery } from "./delivery.model";

export interface IOrder extends mongoose.Document {
  user: mongoose.Types.ObjectId | IUser;
  products: {
    toObject(): any;
    product: mongoose.Types.ObjectId | IProduct;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: "pending" | "processing" | "paid" | "shipped" | "delivered" | "cancelled";
  orderSlug: string;
  delivery?: mongoose.Types.ObjectId | IDelivery;
  createdAt: Date;
  updatedAt: Date;
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
    delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery"
    },
    orderSlug: {
      type: String,
      unique: true,
      required: true,
      default: "TEMP-SLUG", // Temporary default value
    },
  },
  { timestamps: true }
);

// Improved pre-save hook for order slug generation
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // Find the highest order slug
      const lastOrder = await Order.findOne({}, {}, { sort: { 'orderSlug': -1 } });
      
      let nextNumber = 1;
      if (lastOrder && lastOrder.orderSlug) {
        const lastSlugNumber = parseInt(lastOrder.orderSlug.split('-')[1]);
        if (!isNaN(lastSlugNumber)) {
          nextNumber = lastSlugNumber + 1;
        }
      }
      
      this.orderSlug = `ORD-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;