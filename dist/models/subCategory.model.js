"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const subCategorySchema = new mongoose_1.default.Schema({
    subCategoryName: {
        type: String,
        unique: true,
    },
    category: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Category",
        required: [true, "Category is required"],
    },
    description: {
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
const SubCategory = mongoose_1.default.model("SubCategory", subCategorySchema);
exports.default = SubCategory;
