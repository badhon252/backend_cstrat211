import express from "express";
import cors from "cors";
import app from "./app";
import { port } from "./config";
import dbConfig from "./dbConfig/dbConnection";
import authRoutes from "./routes/auth.routes";






app.use(cors());
app.use(express.json());
app.use("/api/v1/auth", authRoutes);


// run server
dbConfig().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on: http://localhost:${port}`);
  });
}).catch((err) => {
  console.error("Database connection failed:", err);
  process.exit(1);
});
