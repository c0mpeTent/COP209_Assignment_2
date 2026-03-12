import { Router } from "express";
import { createProject , deleteProject , getProjects  } from "../controllers/projectController.js";
import { addProjectMember , changeProjectMemberRole , deleteProjectMember } from "../controllers/projectMemberController.js";
const router = Router();

// URL will be POST /api/project/create
router.post("/create", createProject);
router.get("/get", getProjects);
router.delete("/delete/:projectId",deleteProject);
router.post("/add-member",addProjectMember);
router.patch("/change-member-role",changeProjectMemberRole);
router.delete("/delete-member",deleteProjectMember);


export default router;
