import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: "customer" | "admin";
  otp?: string;
  otpExpire?: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String,  },
    email: { type: String,  unique: true },
    phone: { type: String, required: function () { return this.role === "customer"; }},
    password: { type: String,},
    role: { type: String, enum: ["customer", "admin"], required: true },
    otp: { type: String },
    otpExpire: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
