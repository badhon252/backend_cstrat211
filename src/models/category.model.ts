import mongoose from "mongoose";

export interface ICategory extends mongoose.Document {
  categoryName: string;
  description: string;
  categoryImage: string;
  stock: number;
  sales: number;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    categoryName: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
    },
    categoryImage: {
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

const Category = mongoose.model<ICategory>("Category", categorySchema);

export default Category;
