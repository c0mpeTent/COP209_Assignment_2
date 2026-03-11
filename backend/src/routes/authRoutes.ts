import { Router } from "express";
import { register, login, logout } from "../controllers/authController.js";

const router = Router();

// URL will be POST /api/auth/register
router.post("/register", register);

// Route for Login: POST /api/auth/login
router.post("/login", login);

// Route for Logout: POST /api/auth/logout
router.post("/logout", logout);

export default router;
