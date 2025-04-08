import mongoose from "mongoose";

export interface IProduct extends mongoose.Document {
  name: string;
  description: string;
  price: number;
  category: mongoose.Types.ObjectId;
  subcategory: mongoose.Types.ObjectId;
  type: string;
  sustainability: string;
  rating: number;
  reviewCount: number;
  popularity: number;
  quantity: number;
  inStock: boolean;
  isCustomizable: boolean;
  media: {
    images: string[];
    videos: string[];
  };
  sizes: string[];
  colors: {
    name: string;
    hex: string;
    images?: {
      front?: string;
      back?: string;
      side?: string;
    };
  }[];
  sku: string;
  createdAt: Date;
}

const productSchema = new mongoose.Schema<IProduct>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true },
    type: { type: String, required: true },
    sustainability: { type: String, default: "none" },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    popularity: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    inStock: { type: Boolean, default: true },
    isCustomizable: { type: Boolean, required: true },
    media: {
      images: [{ type: String }],
      videos: [{ type: String }],
    },
    sizes: [{ type: String }],
    colors: [{
      name: { type: String },
      hex: { type: String },
      images: {
        front: { type: String },
        back: { type: String },
        side: { type: String },
      },
    }],
    sku: { type: String, unique: true, required: true }, // Ensure SKU is unique and required
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>("Product", productSchema);