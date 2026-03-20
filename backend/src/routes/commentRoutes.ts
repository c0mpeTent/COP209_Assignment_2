
import { Router } from "express";
import {
  createComment,
  deleteComment,
  getTaskComments,
  updateComment,
} from "../controllers/commentController.js";

const router = Router();

router.get("/task/:workflowId/:taskId", getTaskComments);
router.post("/task/:workflowId/:taskId", createComment);
router.patch("/:commentId", updateComment);
router.delete("/:commentId", deleteComment);

export default router;
