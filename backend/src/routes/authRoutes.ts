import { Router } from "express";
import { register, login } from "../controllers/authController.js";

const router = Router();

// URL will be POST /api/auth/register
router.post("/register", register);

// Route for Login: POST /api/auth/login
router.post("/login", login);

export default router;
