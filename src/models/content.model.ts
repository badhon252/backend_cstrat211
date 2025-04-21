import { Schema, model, Document } from 'mongoose';

interface IContent extends Document {
  content: string;
}

const contentSchema = new Schema<IContent>({
  content: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  strict: true, // Add this to reject unknown fields like 'id'
});

export const Content = model<IContent>('Content', contentSchema);