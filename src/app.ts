import express, { Request, Response } from "express";
import cors from "cors";
import categoryRouter from "./routes/category.routes";

const app = express();

// required middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("uploads"));
app.use(cors({ origin: "*" }));

// routes
app.use("/api/v1/categories", categoryRouter);

export default app;
