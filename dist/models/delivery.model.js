"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const deliverySchema = new mongoose_1.default.Schema({
    order: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        unique: true
    },
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    houseNoStreet: {
        type: String,
        required: true
    },
    colonyLocality: {
        type: String,
        required: true
    },
    region: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    area: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    }
}, { timestamps: true });
const Delivery = mongoose_1.default.model("Delivery", deliverySchema);
exports.default = Delivery;
