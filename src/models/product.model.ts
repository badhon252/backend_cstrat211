import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  productName: string;
  description: string;
  category: mongoose.Schema.Types.ObjectId;
  tags: string[];
  status: "draft" | "low stock" | "out of stock" | "published";
  images: string[];
  videos: string[];
  basePrice: number;
  discountType?: "percentage" | "fixed" | null;
  discountPercentage?: number;
  discountFixed?: number;
  sku: string;
  quantity: number;
  colors: string[];
  height?: number;
  length?: number;
  width?: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema: Schema = new Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "low stock", "out of stock", "published"],
        message: "Status must be either draft, low stock, out of stock, or published",
      },
      default: "draft",
    },
    images: {
      type: [String],
      default: [],
    },
    videos: {
      type: [String],
      default: [],
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountType: {
      type: String,
      enum: {
        values: ["percentage", "fixed"],
        message: "Discount type must be either percentage or fixed",
      },
    },
    discountPercentage: {
      type: Number,
      min: [0, "Discount percentage cannot be negative"],
      max: [100, "Discount percentage cannot exceed 100%"],
    },
    discountFixed: {
      type: Number,
      min: [0, "Fixed discount cannot be negative"],
    },
    sku: {
      type: String,
    //   required: [true, "SKU is required"],
      unique: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    colors: {
      type: [String],
      default: [],
    },
    height: {
      type: Number,
      min: [0, "Height cannot be negative"],
    },
    length: {
      type: Number,
      min: [0, "Length cannot be negative"],
    },
    width: {
      type: Number,
      min: [0, "Width cannot be negative"],
    },
  },
  { timestamps: true }
);

// Auto-generate SKU before saving
productSchema.pre<IProduct>("save", function (next) {
  if (!this.sku) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = this.productName.substring(0, 3).toUpperCase();
    this.sku = `${prefix}-${randomNum}`;
  }
  next();
});

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;