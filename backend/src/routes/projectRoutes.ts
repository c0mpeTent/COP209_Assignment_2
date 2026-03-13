import { Router } from "express";
import { createProject , deleteProject , getProjects, getProject, setProjectDescription } from "../controllers/projectController.js";
import { addProjectMember , changeProjectMemberRole , deleteProjectMember } from "../controllers/projectMemberController.js";
import { addWorkflow } from "../controllers/projectBoardController.js";
const router = Router();

// URL will be POST /api/project/create
router.post("/create", createProject);
router.get("/get", getProjects);
router.delete("/delete/:projectId",deleteProject);
router.post("/add-member",addProjectMember);
router.patch("/change-member-role",changeProjectMemberRole);
router.delete("/delete-member",deleteProjectMember);
router.get("/get-project/:projectId",getProject);
router.patch("/set-project-description",setProjectDescription);
router.post("/add-workflow",addWorkflow);

export default router;
