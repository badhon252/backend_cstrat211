import mongoose from "mongoose";
import { IOrder } from "./order.model";

interface IDelivery extends mongoose.Document {
  order: mongoose.Types.ObjectId | IOrder;
  fullName: string;
  phoneNumber: string;
  houseNoStreet: string;
  colonyLocality: string;
  region: string;
  city: string;
  area: string;
  address: string;
  deliveryStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new mongoose.Schema<IDelivery>(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true
    },
    fullName: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    houseNoStreet: {
      type: String,
      required: true
    },
    colonyLocality: {
      type: String,
      required: true
    },
    region: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    area: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

const Delivery = mongoose.model<IDelivery>("Delivery", deliverySchema);

export default Delivery;
export { IDelivery };
