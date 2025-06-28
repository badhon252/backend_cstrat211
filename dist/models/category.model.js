"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const categorySchema = new mongoose_1.default.Schema({
    categoryName: {
        type: String,
        unique: true,
    },
    description: {
        type: String,
    },
    categoryImage: {
        type: String,
    },
    stock: {
        type: Number,
        default: 0,
    },
    sales: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });
const Category = mongoose_1.default.model("Category", categorySchema);
exports.default = Category;
