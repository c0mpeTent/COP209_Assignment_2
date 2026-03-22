import { Router } from "express";
import { createProject , deleteProject , getProjects, getProject , updateProject, changeProjectArchive } from "../controllers/projectController.js";
import { addProjectMember , changeProjectMemberRole , deleteProjectMember } from "../controllers/projectMemberController.js";
import { createWorkflow , createTask , getWorkflow , deleteTask  , getTaskDetails , updateWorkflow , changeTask , addColumn,updateColumn,reorderColumns,deleteColumn,deleteWorkflow ,updateTransitionRules,updateResolvedColumn,addInvalidTransition, deleteInvalidTransition,} from "../controllers/projectWorkflowController.js";
const router = Router();

// URL will be POST /api/project/
router.post("/create", createProject);
router.get("/get", getProjects);
router.delete("/delete/:projectId",deleteProject);
router.get("/get-project/:projectId",getProject);
// router.patch("/set-project-description",setProjectDescription);
router.patch("/update/:projectId",updateProject);
router.patch("/archive/:projectId",changeProjectArchive);

router.post("/add-member",addProjectMember);
router.patch("/change-member-role",changeProjectMemberRole);
router.delete("/delete-member",deleteProjectMember);

router.post("/add-workflow",createWorkflow);
router.get("/get-workflow/:projectId/:workflowId",getWorkflow);
router.get("/task/:workflowId/:taskId",getTaskDetails);
router.patch("/update-workflow/:workflowId", updateWorkflow);
router.post("/add-task",createTask);
router.patch("/update-task/:workflowId/:taskId", changeTask);
router.delete("/delete-task/:workflowId/:taskId",deleteTask);
router.post("/add-column/:workflowId", addColumn);
router.patch("/update-column/:workflowId/:columnId", updateColumn);
router.patch("/reorder-columns/:workflowId", reorderColumns);
router.delete("/delete-column/:workflowId/:columnId", deleteColumn);
router.delete("/delete-workflow/:workflowId", deleteWorkflow);
router.patch("/transition-rules/:workflowId", updateTransitionRules);
router.patch("/resolved-column/:workflowId", updateResolvedColumn);
router.post("/invalid-transition/:workflowId", addInvalidTransition);
router.delete("/invalid-transition/:workflowId/:transitionId", deleteInvalidTransition);


export default router;
