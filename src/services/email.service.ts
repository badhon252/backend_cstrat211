import nodemailer from "nodemailer";
import { emailUser, emailPass } from "../config/index";
import { ContactFormData } from "../models/ContactForm";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

export const sendOtpEmail = async (email: string, otp: string) => {
  await transporter.sendMail({
    from: emailUser,
    to: email,
    subject: "Password Reset OTP",
    text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
  });
};

export const sendContactEmail = async (formData: ContactFormData) => {
  const emailContent = `

    Name: ${formData.name}
    Email: ${formData.email}
    Phone: ${formData.phone || 'Not provided'}
    
    Message:
    ${formData.message}
  `;

  await transporter.sendMail({
    from: emailUser,
    to: emailUser, // Sending to admin email
    subject: `New Contact Form Submission from ${formData.name}`,
    text: emailContent,
  });
};
