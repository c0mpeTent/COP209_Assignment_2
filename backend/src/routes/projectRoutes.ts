import { Router } from "express";
import { createProject , deleteProject, getProjects } from "../controllers/projectController.js";

const router = Router();

// URL will be POST /api/project/create
router.post("/create", createProject);
router.get("/get", getProjects);
router.delete("/delete/:projectId",deleteProject);


export default router;
