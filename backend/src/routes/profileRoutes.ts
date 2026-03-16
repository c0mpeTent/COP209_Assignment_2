import { Router } from "express";
import {updateAvatar , deleteAvatar,updateProfile} from "../controllers/profileController.js";

const router = Router();


router.delete("/delete-avatar", deleteAvatar);
router.patch("/update", updateProfile);

export default router;