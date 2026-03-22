import { Router } from "express";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  clearNotificationHistory,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);
router.delete("/clear-history", clearNotificationHistory);

export default router;