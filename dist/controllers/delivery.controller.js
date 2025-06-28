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
exports.getDeliveryByOrderId = exports.createDelivery = void 0;
const delivery_model_1 = __importDefault(require("../models/delivery.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const user_model_1 = require("../models/user.model");
const mongoose_1 = __importDefault(require("mongoose"));
const createDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId, userId, fullName, phoneNumber, houseNoStreet, colonyLocality, region, city, area, address } = req.body;
        // Check if order exists
        const order = yield order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found"
            });
        }
        // Check if userId is provided
        if (!userId) {
            return res.status(400).json({
                status: false,
                message: "User ID is required"
            });
        }
        // Validate userId
        const user = yield user_model_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }
        // Create delivery
        const delivery = new delivery_model_1.default({
            order: new mongoose_1.default.Types.ObjectId(orderId),
            user: new mongoose_1.default.Types.ObjectId(userId),
            fullName,
            phoneNumber,
            houseNoStreet,
            colonyLocality,
            region,
            city,
            area,
            address
        });
        yield delivery.save();
        // Update order with delivery reference
        yield order_model_1.default.findByIdAndUpdate(orderId, { delivery: delivery._id });
        res.status(201).json({
            status: true,
            message: "Delivery created successfully",
            data: delivery,
            orderStatus: order.status,
            orderAmount: order.totalAmount
        });
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "Error creating delivery",
            error: error.message
        });
    }
});
exports.createDelivery = createDelivery;
const getDeliveryByOrderId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const delivery = yield delivery_model_1.default.findOne({ order: orderId })
            .populate('order');
        // .populate('user');
        if (!delivery) {
            return res.status(404).json({
                status: false,
                message: "Delivery not found"
            });
        }
        // Proper type checking
        const populatedOrder = delivery.order;
        const orderAmount = 'totalAmount' in populatedOrder ? populatedOrder.totalAmount : undefined;
        const orderStatus = 'status' in populatedOrder ? populatedOrder.status : undefined;
        res.status(200).json({
            status: true,
            message: "Delivery retrieved successfully",
            data: delivery,
            orderStatus,
            orderAmount
        });
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "Error fetching delivery",
            error: error.message
        });
    }
});
exports.getDeliveryByOrderId = getDeliveryByOrderId;
