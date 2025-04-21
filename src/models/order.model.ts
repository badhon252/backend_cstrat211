import mongoose from "mongoose";
import { IUser } from "./user.model";
import { IProduct } from "./product.model";

export interface IOrder extends mongoose.Document {
  user: mongoose.Types.ObjectId | IUser;
  products: {
    product: mongoose.Types.ObjectId | IProduct;
    quantity: number;
    price: number;
    customization?: {
      color: string | null;
      size: string;
      frontCustomizationPreview: string;
      logoImage: string;
    };
  }[];
  totalAmount: number;
  status: "pending" | "processing" | "paid" | "shipped" | "delivered" | "cancelled";
  orderSlug: string;
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
        customization: {
          color: {
            type: String,
            default: null,
          },
          size: {
            type: String,
            
          },
          frontCustomizationPreview: {
            type: String,
            
          },
          logoImage: {
            type: String,
            
          },
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
    orderSlug: {
      type: String,
      unique: true,
      required: true,
      default: "TEMP-SLUG", // Temporary default value
    },
  },
  { timestamps: true }
);

// Pre-save hook for order slug generation
orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const lastOrder = await Order.findOne({}, {}, { sort: { orderSlug: -1 } });
      let nextNumber = 1;
      if (lastOrder && lastOrder.orderSlug) {
        const lastSlugNumber = parseInt(lastOrder.orderSlug.split("-")[1]);
        if (!isNaN(lastSlugNumber)) {
          nextNumber = lastSlugNumber + 1;
        }
      }
      this.orderSlug = `ORD-${nextNumber.toString().padStart(3, "0")}`;
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;