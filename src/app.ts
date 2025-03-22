import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

// required middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./public"));
app.use(cors({ origin: "*" }));

// routes

export default app;
