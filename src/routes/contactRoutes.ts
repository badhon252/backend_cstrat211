import express from 'express';
import { submitContactForm } from '../controllers/contactController';
import { ContactFormData } from '../models/ContactForm';

const router = express.Router();

router.post('/send', async (req, res) => {
  try {
    const formData: ContactFormData = req.body;
    const result = await submitContactForm(formData);
    
    if (result.status) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in contact route:', error);
    res.status(500).json({ 
      status: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;
