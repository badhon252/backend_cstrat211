import { ContactFormData } from '../models/ContactForm';
import { sendContactEmail } from '../services/email.service';

export const submitContactForm = async (formData: ContactFormData) => {
  try {
    // Validate form data
    if (!formData.name || !formData.email || !formData.message) {
      return { status: false, message: 'Name, email and message are required' };
    }

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
