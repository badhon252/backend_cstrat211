import mongoose from "mongoose";
import { IOrder } from "./order.model";
import { IUser } from "./user.model";

interface IDelivery extends mongoose.Document {
  order: mongoose.Types.ObjectId | IOrder;
  user: mongoose.Types.ObjectId | IUser;
  fullName: string;
  phoneNumber: string;
  houseNoStreet: string;
  colonyLocality: string;
  region: string;
  city: string;
  area: string;
  address: string;
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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
    }
  },
  { timestamps: true }
);

const Delivery = mongoose.model<IDelivery>("Delivery", deliverySchema);

export default Delivery;
export { IDelivery };