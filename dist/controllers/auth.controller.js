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
exports.logout = exports.getUserById = exports.getAllUsers = exports.uploadAvatar = exports.updateUserProfile = exports.resetPassword = exports.verifyOtp = exports.forgotPassword = exports.setNewPassword = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = require("../models/user.model");
const generateToken_1 = require("../utils/generateToken");
const generateOtp_1 = require("../utils/generateOtp");
const email_service_1 = require("../services/email.service");
const cloudinary_1 = require("../utils/cloudinary");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, password, role } = req.body;
        const existingUser = yield user_model_1.User.findOne({ email });
        if (existingUser) {
            return res
                .status(400)
                .json({ status: false, message: "User already exists" });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const newUser = yield user_model_1.User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role,
        });
        res.status(201).json({
            status: true,
            message: "User registered successfully",
            token: (0, generateToken_1.generateToken)(newUser.id, newUser.role),
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Server error" });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield user_model_1.User.findOne({ email });
        if (!user || !(yield bcryptjs_1.default.compare(password, user.password))) {
            return res
                .status(401)
                .json({ status: false, message: "Invalid email or password" });
        }
        res.json({
            status: true,
            message: "Login successful",
            token: (0, generateToken_1.generateToken)(user.id, user.role),
            user,
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Server error" });
    }
});
exports.login = login;
// Set new password
const setNewPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!userId) {
            return res.status(400).json({ status: false, message: "User ID is required" });
        }
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ status: false, message: "All fields are required" });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ status: false, message: "New password and confirm password do not match" });
        }
        const user = yield user_model_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        const isCurrentPasswordValid = yield bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ status: false, message: "Invalid current password" });
        }
        const hashedNewPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedNewPassword;
        yield user.save();
        res.status(200).json({ status: true, message: "Password updated successfully" });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Server error" });
    }
});
exports.setNewPassword = setNewPassword;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield user_model_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        const otp = (0, generateOtp_1.generateOtp)();
        user.otp = otp;
        user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
        yield user.save();
        yield (0, email_service_1.sendOtpEmail)(email, otp);
        res.json({ status: true, message: "OTP sent successfully" });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Server error" });
    }
});
exports.forgotPassword = forgotPassword;
//  Verify OTP
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, otp } = req.body;
        const user = yield user_model_1.User.findOne({ email });
        if (!user ||
            user.otp !== otp ||
            !user.otpExpire ||
            user.otpExpire < new Date()) {
            return res
                .status(400)
                .json({ status: false, message: "Invalid or expired OTP" });
        }
        user.otp = undefined;
        user.otpExpire = undefined;
        yield user.save();
        res.json({ status: true, message: "OTP verified successfully" });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Server error" });
    }
});
exports.verifyOtp = verifyOtp;
//  Reset Password
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, newPassword } = req.body;
        const user = yield user_model_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        user.password = yield bcryptjs_1.default.hash(newPassword, 10);
        yield user.save();
        res.json({ status: true, message: "Password reset successfully" });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Server error" });
    }
});
exports.resetPassword = resetPassword;
// update profile
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ status: false, message: "unauthorized" });
            return;
        }
        const { name, phone, gender, address } = req.body;
        if (name && typeof name !== "string") {
            res.status(400).json({ status: false, message: "name must be a string" });
            return;
        }
        if (phone && typeof phone !== "string") {
            res
                .status(400)
                .json({ status: false, message: "phone number must be a string" });
            return;
        }
        if (gender && !["male", "female", "other"].includes(gender.toLowerCase())) {
            res.status(400).json({ status: false, message: "Invalid gender value" });
            return;
        }
        if (address && typeof address !== "string") {
            res
                .status(400)
                .json({ status: false, message: "address must be a string" });
            return;
        }
        const user = yield user_model_1.User.findById(userId);
        if (!user) {
            res.status(404).json({ status: false, message: "user not found" });
            return;
        }
        if (name)
            user.name = name;
        if (phone)
            user.phone = phone;
        if (gender)
            user.gender = gender;
        if (address)
            user.address = address;
        yield user.save();
        res.status(200).json({
            status: true,
            message: "profile updated successfully",
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                address: user.address,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});
exports.updateUserProfile = updateUserProfile;
// upload avatar
const uploadAvatar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!req.file) {
            res.status(400).json({ status: false, message: "no file uploaded" });
            return;
        }
        const cloudinaryUrl = yield (0, cloudinary_1.uploadToCloudinary)(req.file.path, "avatar");
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.body.userId;
        const user = yield user_model_1.User.findByIdAndUpdate(userId, { avatar: cloudinaryUrl }, { new: true });
        if (!user) {
            res.status(404).json({ status: false, message: "user not found" });
            return;
        }
        res.status(200).json({
            status: true,
            message: "avatar uploaded successfully",
            user,
        });
        return;
    }
    catch (error) {
        res.status(500).json({ status: false, message: "server error" });
        return;
    }
});
exports.uploadAvatar = uploadAvatar;
// get all users
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchName = req.query.name;
        const searchPhone = req.query.phone;
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
        const query = {};
        if (searchName) {
            query.name = { $regex: searchName, $options: "i" };
        }
        if (searchPhone) {
            query.phone = { $regex: searchPhone, $options: "i" };
        }
        const totalUsers = yield user_model_1.User.countDocuments(query);
        const users = yield user_model_1.User.find(query)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .select("name email phone gender role avatar createdAt");
        const totalPages = Math.ceil(totalUsers / limit);
        res.status(200).json({
            status: true,
            message: "fetched all users successfully",
            users,
            pagination: {
                totalUsers,
                currentPage: page,
                totalPages,
                limit,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "server error",
        });
        return;
    }
});
exports.getAllUsers = getAllUsers;
// get a single user
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const user = yield user_model_1.User.findById(userId).select("name email phone gender address avatar role createdAt");
        if (!user) {
            res.status(404).json({
                status: false,
                message: "user not found",
            });
            return;
        }
        res.status(200).json({
            status: true,
            message: "user fetched successfully",
            user,
        });
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "Server error",
        });
        return;
    }
});
exports.getUserById = getUserById;
//  Logout (Just clearing token on frontend)
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ status: true, message: "Logged out successfully" });
});
exports.logout = logout;
