"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const product_route_1 = __importDefault(require("./routes/product.route"));
const subCategory_routes_1 = __importDefault(require("./routes/subCategory.routes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const analysis_routes_1 = __importDefault(require("./routes/analysis.routes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const refundRoutes_1 = __importDefault(require("./routes/refundRoutes"));
const content_routes_1 = __importDefault(require("./routes/content.routes"));
const app = (0, express_1.default)();
// required middlewares
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static("uploads"));
app.use((0, cors_1.default)({ origin: "*" }));
// routes
app.use("/api/v1/categories", category_routes_1.default);
app.use("/api/v1/subcategories", subCategory_routes_1.default);
app.use("/api/v1/products", product_route_1.default);
app.use("/api/v1/contact", contactRoutes_1.default);
app.use("/api/v1/orders", order_routes_1.default);
app.use("/api/v1/payments", payment_routes_1.default);
app.use("/api/v1/deliveries", delivery_routes_1.default);
app.use('/api/v1/analytics', analysis_routes_1.default);
app.use("/api/v1/reviews", reviewRoutes_1.default);
app.use("/api/v1/", refundRoutes_1.default);
app.use("/api/v1/content", content_routes_1.default);
exports.default = app;
