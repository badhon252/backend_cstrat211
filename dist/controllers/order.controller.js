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
exports.customizeProductAndCreateOrder = exports.getBestSellingProducts = exports.cancelOrder = exports.getOrderHistory = exports.deleteOrder = exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = exports.createOrder = void 0;
const order_model_1 = __importDefault(require("../models/order.model"));
const product_model_1 = __importDefault(require("../models/product.model"));
const user_model_1 = require("../models/user.model");
const delivery_model_1 = __importDefault(require("../models/delivery.model"));
const cloudinary_1 = require("../utils/cloudinary");
// Create a new order
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user: userId, products } = req.body;
        // Validate inputs
        if (!userId || !products) {
            return res.status(400).json({
                status: false,
                message: "User ID and products array are required",
            });
        }
        // Validate user exists
        const user = yield user_model_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }
        // Validate products
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Products must be a non-empty array"
            });
        }
        // Process products
        let totalAmount = 0;
        const orderProducts = [];
        for (const item of products) {
            if (!item.product || !item.quantity) {
                return res.status(400).json({
                    status: false,
                    message: "Each product must have an ID and quantity",
                });
            }
            const product = yield product_model_1.default.findById(item.product);
            if (!product) {
                return res.status(404).json({
                    status: false,
                    message: `Product with ID ${item.product} not found`,
                });
            }
            if (item.quantity < 1) {
                return res.status(400).json({
                    status: false,
                    message: `Quantity must be at least 1 for product ${product.name}`,
                });
            }
            const price = product.price;
            totalAmount += price * item.quantity;
            orderProducts.push({
                product: item.product,
                quantity: item.quantity,
                price,
            });
        }
        // Create and save order
        const order = new order_model_1.default({
            user: userId,
            products: orderProducts,
            totalAmount,
        });
        // Explicitly save to trigger pre-save hooks
        yield order.save();
        // Verify orderSlug was generated
        if (!order.orderSlug || order.orderSlug === 'TEMP-SLUG') {
            throw new Error('Order slug generation failed');
        }
        // Populate order details
        const populatedOrder = yield order_model_1.default.findById(order._id)
            .populate("user", "name email")
            .populate("products.product", "name price images");
        if (!populatedOrder) {
            throw new Error('Order population failed');
        }
        // Successful response
        res.status(201).json({
            status: true,
            message: "Order created successfully",
            data: Object.assign(Object.assign({}, populatedOrder.toObject()), { orderSlug: order.orderSlug }),
        });
    }
    catch (error) {
        console.error("Order creation error:", error);
        res.status(500).json({
            status: false,
            message: "Error creating order",
            error: error.message
        });
    }
});
exports.createOrder = createOrder;
// Get all orders with pagination and search
const getAllOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Search and filter parameters
        const search = req.query.search;
        const status = req.query.status;
        const userId = req.query.userId;
        // Build the base query
        let baseQuery = order_model_1.default.find();
        // Apply filters
        if (status) {
            baseQuery = baseQuery.where('status').equals(status);
        }
        if (userId) {
            baseQuery = baseQuery.where('user').equals(userId);
        }
        // Apply search if provided
        if (search) {
            baseQuery = baseQuery.populate({
                path: 'products.product',
                match: { name: { $regex: search, $options: 'i' } },
                select: 'name price'
            }).populate("user", "name email");
        }
        else {
            baseQuery = baseQuery.populate("user", "name email")
                .populate("products.product", "name price images");
        }
        // Execute the query with pagination
        const orders = yield baseQuery
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean() // Convert to plain JavaScript objects
            .exec();
        // Get total count (different approach for search vs non-search)
        let totalCount;
        if (search) {
            // For search, we need to count after filtering null products
            const allOrders = yield baseQuery.lean().exec();
            totalCount = allOrders.filter(order => order.products.some(p => p.product !== null)).length;
        }
        else {
            // For non-search, we can use countDocuments
            totalCount = yield order_model_1.default.countDocuments(baseQuery.getFilter());
        }
        // Filter out orders with null products when searching
        const filteredOrders = search
            ? orders.filter(order => order.products.some(p => p.product !== null))
            : orders;
        // Format the response
        const response = {
            status: true,
            message: "Orders retrieved successfully",
            data: {
                orders: filteredOrders.map(order => (Object.assign(Object.assign({}, order), { 
                    // No need for toObject() since we used lean()
                    orderSlug: order.orderSlug }))),
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error("Error retrieving orders:", error);
        res.status(500).json({
            status: false,
            message: "Error retrieving orders",
            error: error.message
        });
    }
});
exports.getAllOrders = getAllOrders;
// Get order by ID
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const order = yield order_model_1.default.findById(id)
            .populate("user", "name")
            .populate({
            path: "products.product",
            select: "name price media.images",
        })
            .lean(); // Convert to plain JavaScript object
        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found" });
        }
        // Transform the products array to flatten the structure
        const transformedOrder = Object.assign(Object.assign({}, order), { products: order.products.map(item => {
                var _a;
                return (Object.assign(Object.assign({}, item), { product: {
                        _id: item.product._id,
                        name: item.product.name,
                        price: item.product.price,
                        images: ((_a = item.product.media) === null || _a === void 0 ? void 0 : _a.images) || []
                    } }));
            }) });
        res.status(200).json({
            status: true,
            message: "Order fetched successfully",
            order: transformedOrder
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Error fetching order", error });
    }
});
exports.getOrderById = getOrderById;
// Update order status
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ status: false, message: "Invalid status value" });
        }
        const order = yield order_model_1.default.findByIdAndUpdate(id, { status }, { new: true })
            .populate("user", "name")
            .populate("products.product", "name price");
        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found" });
        }
        res.status(200).json({
            status: true,
            message: "Order status updated successfully",
            order,
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Error updating order status", error });
    }
});
exports.updateOrderStatus = updateOrderStatus;
// Delete order
const deleteOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const order = yield order_model_1.default.findByIdAndDelete(id);
        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found" });
        }
        res.status(200).json({
            status: true,
            message: "Order deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Error deleting order", error });
    }
});
exports.deleteOrder = deleteOrder;
// Get order history for a specific user
const getOrderHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        // Validate user ID
        if (!userId) {
            return res.status(400).json({
                status: false,
                message: "User ID is required",
            });
        }
        // Fetch orders for the user
        const orders = yield order_model_1.default.find({ user: userId })
            .populate("products.product", "name price")
            .sort({ createdAt: -1 });
        // Fetch delivery status for each order
        const orderHistory = yield Promise.all(orders.map((order) => __awaiter(void 0, void 0, void 0, function* () {
            const delivery = yield delivery_model_1.default.findOne({ order: order._id });
            return {
                orderNo: order.orderSlug,
                total: `${order.totalAmount} (${order.products.length} Products)`,
                status: order ? order.status : "Not Assigned",
                date: order.createdAt,
                orderId: order._id,
            };
        })));
        res.status(200).json({
            status: true,
            message: "Order history retrieved successfully",
            data: orderHistory,
        });
    }
    catch (error) {
        console.error("Error retrieving order history:", error);
        res.status(500).json({
            status: false,
            message: "Error retrieving order history",
            error: error.message,
        });
    }
});
exports.getOrderHistory = getOrderHistory;
// Cancel an order// Cancel an order
const cancelOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const { userId } = req.body; // Assuming we get userId from authenticated user
        // Find the order
        const order = yield order_model_1.default.findOne({
            _id: orderId,
            user: userId
        }).populate('delivery');
        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found or doesn't belong to this user"
            });
        }
        // Check if order can be cancelled
        if (order.status === 'cancelled') {
            return res.status(400).json({
                status: false,
                message: "Order is already cancelled"
            });
        }
        if (order.status === 'delivered') {
            return res.status(400).json({
                status: false,
                message: "Delivered orders cannot be cancelled"
            });
        }
        // Update order status
        order.status = 'cancelled';
        // Update delivery status if exists
        const deliveryId = order.delivery;
        if (deliveryId) {
            const delivery = yield delivery_model_1.default.findById(deliveryId);
            if (delivery) {
                delivery.set('status', 'cancelled');
                yield delivery.save();
            }
        }
        yield order.save();
        res.status(200).json({
            status: true,
            message: "Order cancelled successfully",
            data: {
                orderId: order._id,
                status: order.status,
                orderSlug: order.orderSlug
            }
        });
    }
    catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({
            status: false,
            message: "Error cancelling order",
            error: error.message
        });
    }
});
exports.cancelOrder = cancelOrder;
const getBestSellingProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all orders excluding cancelled orders
        const orders = yield order_model_1.default.find({
            status: { $ne: "cancelled" }, // Exclude cancelled orders
        })
            .populate("products.product")
            .lean();
        // Create a map to store total quantity sold for each product
        const productQuantityMap = {};
        // Iterate through each order
        for (const order of orders) {
            for (const productItem of order.products) {
                // Check if the product exists and has a valid _id
                if (!productItem.product || !productItem.product._id) {
                    continue; // Skip this product if it's null or undefined
                }
                const productId = productItem.product._id.toString();
                const quantity = productItem.quantity;
                // Exclude products from cancelled deliveries
                if (order.delivery) {
                    if (order && order.status === "cancelled") {
                        continue; // Skip this product if delivery is cancelled
                    }
                }
                // Update the total quantity sold for the product
                if (productQuantityMap[productId]) {
                    productQuantityMap[productId] += quantity;
                }
                else {
                    productQuantityMap[productId] = quantity;
                }
            }
        }
        // Convert the map to an array of objects
        const bestSellingProducts = Object.keys(productQuantityMap).map((productId) => ({
            product: productId,
            totalQuantitySold: productQuantityMap[productId],
        }));
        // Sort the products by totalQuantitySold in descending order
        bestSellingProducts.sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);
        // Fetch product details for the best-selling products
        const topProducts = yield Promise.all(bestSellingProducts.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const product = yield product_model_1.default.findById(item.product).select("name price media.images colors");
            if (!product) {
                return null;
            }
            // Start with the main product images
            let allImages = [...(((_a = product.media) === null || _a === void 0 ? void 0 : _a.images) || [])];
            // Add color images if they exist
            if (product.colors && product.colors.length > 0) {
                for (const color of product.colors) {
                    if (color.images && color.images.length > 0) {
                        allImages = [...allImages, ...color.images];
                    }
                }
            }
            return {
                _id: product._id,
                name: product.name,
                price: product.price,
                images: allImages, // Combined array of all images
                totalQuantitySold: item.totalQuantitySold,
            };
        })));
        // Filter out any null values (products that might have been deleted)
        const filteredProducts = topProducts.filter(product => product !== null);
        // Return the response
        res.status(200).json({
            status: true,
            message: "Best selling products retrieved successfully",
            data: filteredProducts,
        });
    }
    catch (error) {
        console.error("Error fetching best selling products:", error);
        res.status(500).json({
            status: false,
            message: "Error fetching best selling products",
            error: error.message,
        });
    }
});
exports.getBestSellingProducts = getBestSellingProducts;
// Customize product and create order
const customizeProductAndCreateOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { productId, color, size, quantity, userId } = req.body;
        // Validate inputs
        if (!productId || !size || !quantity) {
            return res.status(400).json({
                status: false,
                message: "Product ID, size, and quantity are required",
            });
        }
        // Validate product exists
        const product = yield product_model_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({
                status: false,
                message: "Product not found",
            });
        }
        const files = req.files;
        let frontCustomizationPreviewUrl;
        let logoImageUrl;
        // Upload frontCustomizationPreview to Cloudinary if present
        if ((_a = files === null || files === void 0 ? void 0 : files["frontCustomizationPreview"]) === null || _a === void 0 ? void 0 : _a[0]) {
            frontCustomizationPreviewUrl = yield (0, cloudinary_1.uploadToCloudinary)(files["frontCustomizationPreview"][0].path, "customizations");
        }
        // Upload logoImage to Cloudinary if present
        if ((_b = files === null || files === void 0 ? void 0 : files["logoImage"]) === null || _b === void 0 ? void 0 : _b[0]) {
            logoImageUrl = yield (0, cloudinary_1.uploadToCloudinary)(files["logoImage"][0].path, "logos");
        }
        // Create order products array
        const orderProducts = [
            {
                product: productId,
                quantity,
                price: product.price,
                customization: {
                    color,
                    size,
                    frontCustomizationPreview: frontCustomizationPreviewUrl,
                    logoImage: logoImageUrl,
                    userId,
                },
            },
        ];
        // Calculate total amount
        const totalAmount = product.price * quantity;
        // Create and save order
        const order = new order_model_1.default({
            user: userId,
            products: orderProducts,
            totalAmount,
        });
        yield order.save();
        // Populate order details
        const populatedOrder = yield order_model_1.default.findById(order._id)
            .populate("products.product", "name price images");
        res.status(201).json({
            status: true,
            message: "Order created successfully with customization",
            data: populatedOrder,
        });
    }
    catch (error) {
        console.error("Error customizing product and creating order:", error);
        res.status(500).json({
            status: false,
            message: "Error customizing product and creating order",
            error: error.message,
        });
    }
});
exports.customizeProductAndCreateOrder = customizeProductAndCreateOrder;
