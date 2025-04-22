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
const mongoose_1 = __importDefault(require("mongoose"));
const orderSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    products: [
        {
            product: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            price: {
                type: Number,
                required: true,
                min: 0,
            },
            customization: {
                color: {
                    type: String,
                    default: null,
                },
                size: {
                    type: String,
                },
                frontCustomizationPreview: {
                    type: String,
                },
                logoImage: {
                    type: String,
                },
            },
        },
    ],
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ["pending", "processing", "paid", "shipped", "delivered", "cancelled"],
        default: "pending",
    },
    orderSlug: {
        type: String,
        unique: true,
        required: true,
        default: "TEMP-SLUG", // Temporary default value
    },
}, { timestamps: true });
// Pre-save hook for order slug generation
orderSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isNew) {
            try {
                const lastOrder = yield Order.findOne({}, {}, { sort: { orderSlug: -1 } });
                let nextNumber = 1;
                if (lastOrder && lastOrder.orderSlug) {
                    const lastSlugNumber = parseInt(lastOrder.orderSlug.split("-")[1]);
                    if (!isNaN(lastSlugNumber)) {
                        nextNumber = lastSlugNumber + 1;
                    }
                }
                this.orderSlug = `ORD-${nextNumber.toString().padStart(3, "0")}`;
            }
            catch (error) {
                return next(error);
            }
        }
        next();
    });
});
const Order = mongoose_1.default.model("Order", orderSchema);
exports.default = Order;
