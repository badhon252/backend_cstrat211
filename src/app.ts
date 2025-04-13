import express, { Request, Response } from "express";
import cors from "cors";
import categoryRouter from "./routes/category.routes";
import productRouter from "./routes/product.route";
import subCategoryRouter from "./routes/subCategory.routes";
import contactRouter from "./routes/contactRoutes";

const app = express();

// required middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("uploads"));
app.use(cors({ origin: "*" }));

// routes
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/subcategories", subCategoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/contact", contactRouter);

export default app;
