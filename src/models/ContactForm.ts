export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}
// src/models/ContactForm.ts
import mongoose, { Schema } from 'mongoose';

export const contactFormSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String, required: true },
});

export const ContactForm = mongoose.model('ContactForm', contactFormSchema);