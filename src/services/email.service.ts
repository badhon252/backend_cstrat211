import nodemailer from "nodemailer";
import { emailUser, emailPass } from "../config/index";

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
