import { Router } from "express";
import { createProject , deleteProject , getProjects  ,addProjectMember , changeProjectMemberRole , deleteProjectMember } from "../controllers/projectController.js";

const router = Router();

// URL will be POST /api/project/create
router.post("/create", createProject);
router.get("/get", getProjects);
router.delete("/delete/:projectId",deleteProject);
router.post("/add-member",addProjectMember);
router.post("/change-member-role",changeProjectMemberRole);
router.post("/delete-member",deleteProjectMember);


export default router;
