import { Router } from "express";
import { createProject } from "../controllers/projectController.js";
import { authenticate } from "../middleware/authMiddleware.js"; // Your guard

const router = Router();

// Apply the 'authenticate' middleware to the POST / route
// This means: BEFORE running createProject, run authenticate.
router.post("/", authenticate, createProject);

export default router;
