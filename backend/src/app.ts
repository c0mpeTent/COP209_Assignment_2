import express from "express";
import type { Application } from "express";
import authRoutes from "./routes/authRoutes.js";

const app: Application = express();

// This line is VERY important. It lets your app read JSON data sent from a user.
app.use(express.json());

// This tells the app: "All auth-related URLs start with /api/auth"
app.use("/api/auth", authRoutes);

export default app;
