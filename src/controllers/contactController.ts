// src/controllers/contact.controller.ts
import { ContactFormData } from '../models/ContactForm';
import { sendContactEmail } from '../services/email.service';
import { ContactForm } from '../models/ContactForm'; // Import the ContactForm model

export const submitContactForm = async (formData: ContactFormData) => {
  try {
    // Validate form data
    if (!formData.name || !formData.email || !formData.message) {
      return { status: false, message: 'Name, email and message are required' };
    }

    // Create and save to database
    const newContact = new ContactForm(formData);
    await newContact.save();

    // Send email
    await sendContactEmail(formData);
    
    return { status: true, message: 'Form submitted successfully' };
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to submit form' 
    };
  }
};