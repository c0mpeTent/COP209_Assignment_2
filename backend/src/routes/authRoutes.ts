import { Router } from "express";
import { register } from "../controllers/authController.js";

const router = Router();

// URL will be POST /api/auth/register
router.post("/register", register);

export default router;
