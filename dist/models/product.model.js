"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const productSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountParcentage: { type: Number, default: 0, min: 0, max: 100 },
    category: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "SubCategory", required: true },
    type: { type: String, required: true },
    status: {
        type: String,
        enum: ["draft", "published", "lowstock", "outofstock"],
        default: "draft",
    },
    sustainability: { type: String, default: "none" },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    popularity: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    inStock: { type: Boolean, default: true },
    isCustomizable: { type: Boolean, required: true },
    media: {
        images: [{ type: String }],
        videos: [{ type: String }],
    },
    sizes: [{ type: String }],
    colors: [{
            name: { type: String, required: true },
            hex: { type: String, required: true },
            images: [{ type: String }],
        }],
    sku: { type: String, unique: true, required: true },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Product", productSchema);
