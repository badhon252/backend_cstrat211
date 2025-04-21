import { Schema, model, Document } from 'mongoose';

interface IContent extends Document {
  content: string;
  type: 'about' | 'terms' | 'privacy';
}

const contentSchema = new Schema<IContent>({
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['about', 'terms', 'privacy'],
    required: true,
    unique: true, // Ensure only one document per type
  },
}, {
  strict: true,
});

export const Content = model<IContent>('Content', contentSchema);

