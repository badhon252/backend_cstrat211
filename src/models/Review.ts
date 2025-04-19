import mongoose from "mongoose";

export interface IReview extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  rating: number;
  review?: string;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new mongoose.Schema<IReview>(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    product: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product", 
      required: true 
    },
    rating: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    review: { 
      type: String, 
      maxlength: 1000 
    },
    images: [{ 
      type: String 
    }],
  },
  { timestamps: true }
);

// Ensure a user can only review a product once
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", reviewSchema);