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
exports.dashboardAnalysis = exports.getAnalytics = void 0;
const payment_model_1 = __importDefault(require("../models/payment.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const user_model_1 = require("../models/user.model");
const delivery_model_1 = __importDefault(require("../models/delivery.model"));
const getAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Total income (from payments)
        const totalIncomeResult = yield payment_model_1.default.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalIncome = ((_a = totalIncomeResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
        // Total orders
        const totalOrders = yield order_model_1.default.countDocuments();
        // Total customers
        const totalCustomers = yield user_model_1.User.countDocuments({ role: 'customer' });
        // Sales by location with order total amounts
        const salesByLocation = yield delivery_model_1.default.aggregate([
            {
                $lookup: {
                    from: "orders", // The collection name in MongoDB
                    localField: "order",
                    foreignField: "_id",
                    as: "orderDetails"
                }
            },
            { $unwind: "$orderDetails" },
            { $match: { deliveryStatus: 'delivered' } },
            {
                $group: {
                    _id: { $toLower: "$region" },
                    region: { $first: "$region" }, // Preserve original casing
                    totalAmount: { $sum: "$orderDetails.totalAmount" }
                }
            },
            {
                $project: {
                    _id: 0,
                    region: 1,
                    totalAmount: 1,
                    percentage: {
                        $cond: [
                            { $eq: [totalIncome, 0] },
                            "0%", // Default to "0%" if totalIncome is 0
                            {
                                $concat: [
                                    { $toString: { $ceil: { $multiply: [{ $divide: ["$totalAmount", totalIncome] }, 100] } } },
                                    "%"
                                ]
                            }
                        ]
                    }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);
        // Ensure percentage is defined for all regions
        salesByLocation.forEach((location) => {
            location.percentage = location.percentage || "0%"; // Default to "0%" if undefined
        });
        // Ensure percentage sums up to 100%
        const totalPercentage = salesByLocation.reduce((sum, loc) => sum + parseFloat(loc.percentage.replace("%", "")), 0);
        if (totalPercentage < 100 && salesByLocation.length > 0) {
            const remainingPercentage = 100 - totalPercentage;
            const remainingPercentageString = `${Math.ceil(remainingPercentage)}%`;
            salesByLocation[0].percentage = `${parseFloat(salesByLocation[0].percentage.replace("%", "")) + Math.ceil(remainingPercentage)}%`;
        }
        // Top products
        const topProducts = yield order_model_1.default.aggregate([
            { $unwind: "$products" },
            { $group: { _id: "$products.product", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    name: "$productDetails.name",
                    count: 1
                }
            }
        ]);
        // Cancelled products
        const cancelledProducts = yield delivery_model_1.default.aggregate([
            { $match: { deliveryStatus: 'cancelled' } }, // Match cancelled deliveries
            {
                $lookup: {
                    from: "orders",
                    localField: "order",
                    foreignField: "_id",
                    as: "orderDetails"
                }
            },
            { $unwind: "$orderDetails" },
            { $unwind: "$orderDetails.products" },
            { $group: { _id: "$orderDetails.products.product", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    name: "$productDetails.name",
                    count: 1
                }
            }
        ]);
        // Calculate percentage for cancelled products
        const totalCancelledProducts = cancelledProducts.reduce((sum, product) => sum + product.count, 0);
        cancelledProducts.forEach((product) => {
            product.percentage = totalCancelledProducts > 0
                ? `${Math.ceil((product.count / totalCancelledProducts) * 100)}%`
                : "0%";
        });
        // Response structure with status, message, and data
        res.status(200).json({
            status: true,
            message: "Analytics fetched successfully",
            data: {
                totalIncome,
                totalOrders,
                totalCustomers,
                salesByLocation,
                topProducts,
                cancelledProducts
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "Error fetching analytics",
            error: error.message
        });
    }
});
exports.getAnalytics = getAnalytics;
const dashboardAnalysis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get current year
        const currentYear = new Date().getFullYear();
        // Aggregate payments by month for the current year
        const monthlyPayments = yield payment_model_1.default.aggregate([
            {
                $match: {
                    paymentStatus: 'completed', // Only count completed payments
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalAmount: { $sum: "$amount" }
                }
            },
            {
                $sort: { "_id": 1 } // Sort by month (1-12)
            }
        ]);
        // Calculate total revenue for the year (for percentage calculation)
        const totalYearlyRevenue = monthlyPayments.reduce((sum, month) => sum + month.totalAmount, 0);
        // Create month names array
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // Format the data to match your structure
        const monthlyData = monthNames.map((month, index) => {
            const monthNumber = index + 1;
            const monthPayment = monthlyPayments.find(m => m._id === monthNumber);
            const revenue = (monthPayment === null || monthPayment === void 0 ? void 0 : monthPayment.totalAmount) || 0;
            // Calculate sales percentage (rounded to nearest integer)
            const sales = totalYearlyRevenue > 0
                ? Math.round((revenue / totalYearlyRevenue) * 100)
                : 0;
            return {
                name: month,
                revenue,
                sales
            };
        });
        // If you want to include all months even if they have no data
        // (the above implementation already does this)
        res.status(200).json({
            status: true,
            message: "Dashboard analysis fetched successfully",
            data: monthlyData
        });
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "Error fetching dashboard analysis",
            error: error.message
        });
    }
});
exports.dashboardAnalysis = dashboardAnalysis;
