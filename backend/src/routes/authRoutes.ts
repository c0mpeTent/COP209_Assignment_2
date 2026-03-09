import { Router } from "express";
import { register } from "../controllers/authController.js"; // Use .js because of your ESM setup

const router = Router();

// This connects the URL path to your logic
router.post("/register", register);

export default router;
