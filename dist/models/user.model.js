"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    name: { type: String },
    email: { type: String, unique: true },
    phone: {
        type: String,
        required: function () {
            return this.role === "customer";
        },
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
    },
    address: {
        type: String,
    },
    avatar: {
        type: String,
    },
    password: { type: String },
    role: { type: String, enum: ["customer", "admin"], required: true },
    otp: { type: String },
    otpExpire: { type: Date },
}, { timestamps: true });
exports.User = mongoose_1.default.model("User", userSchema);
