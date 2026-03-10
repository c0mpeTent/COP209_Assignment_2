import express from "express";
import type { Application } from "express";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";

const app: Application = express();

// Middleware to read JSON bodies
app.use(express.json());

//  auth: register and login
app.use("/api/auth", authRoutes);

//  projects: create and manage
app.use("/api/projects", projectRoutes);

export default app;
