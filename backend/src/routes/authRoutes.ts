import { Router } from "express";
import { register, login, logout,refreshSession, validateToken } from "../controllers/authController.js";

const router = Router();

// URL will be POST /api/auth/register
router.post("/register", register);

// Route for Login: POST /api/auth/login
router.post("/login", login);

// Route for Logout: POST /api/auth/logout
router.post("/logout", logout);

// Route for Refresh Session: POST /api/auth/refresh
router.post("/refresh", refreshSession);

// Route for Validate Token: GET /api/auth/me
router.get("/me", validateToken);

export default router;
