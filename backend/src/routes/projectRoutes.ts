import { Router } from "express";
import { createProject , deleteProject , getProjects, getProject, setProjectDescription } from "../controllers/projectController.js";
import { addProjectMember , changeProjectMemberRole , deleteProjectMember } from "../controllers/projectMemberController.js";
import { createWorkflow , createTask , getWorkflow , deleteTask } from "../controllers/projectWorkflowController.js";
const router = Router();

// URL will be POST /api/project/
router.post("/create", createProject);
router.get("/get", getProjects);
router.delete("/delete/:projectId",deleteProject);
router.get("/get-project/:projectId",getProject);
router.patch("/set-project-description",setProjectDescription);

router.post("/add-member",addProjectMember);
router.patch("/change-member-role",changeProjectMemberRole);
router.delete("/delete-member",deleteProjectMember);

router.post("/add-workflow",createWorkflow);
router.get("/get-workflow/:projectId/:workflowId",getWorkflow);
router.post("/add-task",createTask);
router.delete("/delete-task/:workflowId/:taskId",deleteTask);

export default router;
