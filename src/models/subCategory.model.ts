import mongoose from "mongoose";

export interface ISubCategory extends mongoose.Document {
  subCategoryName: string;
  description: string;
  category: mongoose.Types.ObjectId;
  stock: number;
  sales: number;
}

const subCategorySchema = new mongoose.Schema<ISubCategory>(
  {
    subCategoryName: {
      type: String,
      unique: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    description: {
      type: String,
    },
    stock: {
      type: Number,
      default: 0,
    },
    sales: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const SubCategory = mongoose.model<ISubCategory>(
  "SubCategory",
  subCategorySchema
);

export default SubCategory;
