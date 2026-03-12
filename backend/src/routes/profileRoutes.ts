import { Router } from "express";
import {updateAvatar , deleteAvatar} from "../controllers/profileController.js";

const router = Router();

router.post("/update-avatar", updateAvatar);
router.delete("/delete-avatar", deleteAvatar);

export default router;