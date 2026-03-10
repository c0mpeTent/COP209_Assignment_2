import express from "express";
import type { Application } from "express";
import authRoutes from "./routes/authRoutes.js";

const app: Application = express();

// Middleware to read JSON bodies
app.use(express.json());

// Base Route
app.use("/api/auth", authRoutes);

export default app;
