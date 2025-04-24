"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitContactForm = void 0;
const email_service_1 = require("../services/email.service");
const ContactForm_1 = require("../models/ContactForm"); // Import the ContactForm model
const submitContactForm = (formData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate form data
        if (!formData.name || !formData.email || !formData.message) {
            return { status: false, message: 'Name, email and message are required' };
        }
        // Create and save to database
        const newContact = new ContactForm_1.ContactForm(formData);
        yield newContact.save();
        // Send email
        yield (0, email_service_1.sendContactEmail)(formData);
        return { status: true, message: 'Form submitted successfully' };
    }
    catch (error) {
        console.error('Error submitting contact form:', error);
        return {
            status: false,
            message: error instanceof Error ? error.message : 'Failed to submit form'
        };
    }
});
exports.submitContactForm = submitContactForm;
