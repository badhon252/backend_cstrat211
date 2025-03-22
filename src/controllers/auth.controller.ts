import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";
import { generateToken } from "../utils/generateToken";
import { generateOtp } from "../utils/generateOtp";
import { sendOtpEmail } from "../services/email.service";

export const register = async (req: Request, res: Response) => {
    try {
      const { name, email, phone, password, role } = req.body;
      const existingUser = await User.findOne({ email });
  
      if (existingUser) {
        return res.status(400).json({ status: false, message: "User already exists" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({ name, email, phone, password: hashedPassword, role });
  
      res.status(201).json({ 
        status: true, 
        message: "User registered successfully", 
        token: generateToken(newUser.id, newUser.role) 
      });
    } catch (error) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  };
  
  export const login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
  
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ status: false, message: "Invalid email or password" });
      }
  
      res.json({ 
        status: true, 
        message: "Login successful", 
        token: generateToken(user.id, user.role) 
      });
    } catch (error) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  };
  
  export const forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(404).json({ status: false, message: "User not found" });
      }
  
      const otp = generateOtp();
      user.otp = otp;
      user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
  
      await sendOtpEmail(email, otp);
      res.json({ status: true, message: "OTP sent successfully" });
    } catch (error) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  };
  
  //  Verify OTP
  export const verifyOtp = async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      const user = await User.findOne({ email });
  
      if (!user || user.otp !== otp || !user.otpExpire || user.otpExpire < new Date()) {
        return res.status(400).json({ status: false, message: "Invalid or expired OTP" });
      }
  
      user.otp = undefined;
      user.otpExpire = undefined;
      await user.save();
  
      res.json({ status: true, message: "OTP verified successfully" });
    } catch (error) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  };  
  //  Reset Password
  export const resetPassword = async (req: Request, res: Response) => {
    try {
      const { email, newPassword } = req.body;
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(404).json({ status: false, message: "User not found" });
      }
  
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
  
      res.json({ status: true, message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  };
  
  //  Logout (Just clearing token on frontend)
  export const logout = async (req: Request, res: Response) => {
    res.json({ status: true, message: "Logged out successfully" });
  };
