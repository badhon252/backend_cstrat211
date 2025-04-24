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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendContactEmail = exports.sendOtpEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const index_1 = require("../config/index");
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: index_1.emailUser,
        pass: index_1.emailPass,
    },
});
const sendOtpEmail = (email, otp) => __awaiter(void 0, void 0, void 0, function* () {
    yield transporter.sendMail({
        from: index_1.emailUser,
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    });
});
exports.sendOtpEmail = sendOtpEmail;
const sendContactEmail = (formData) => __awaiter(void 0, void 0, void 0, function* () {
    const emailContent = `

    Name: ${formData.name}
    Email: ${formData.email}
    Phone: ${formData.phone || 'Not provided'}
    
    Message:
    ${formData.message}
  `;
    yield transporter.sendMail({
        from: index_1.emailUser,
        to: index_1.emailUser, // Sending to admin email
        subject: `New Contact Form Submission from ${formData.name}`,
        text: emailContent,
    });
});
exports.sendContactEmail = sendContactEmail;
