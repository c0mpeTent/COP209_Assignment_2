import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../types/auth.js";

const serializeNotification = (notification: {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  projectId: string | null;
  workflowId: string | null;
  taskId: string | null;
  targetPath: string | null;
  createdAt: Date;
}) => ({
  id: notification.id,
  type: notification.type,
  message: notification.message,
  isRead: notification.isRead,
  projectId: notification.projectId,
  workflowId: notification.workflowId,
  taskId: notification.taskId,
  targetPath: notification.targetPath,
  createdAt: notification.createdAt,
});

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ]);

    return res.status(200).json({
      notifications: notifications.map((notification) => serializeNotification(notification)),
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const notificationId = req.params.notificationId as string ;

    if (!notificationId) {
      return res.status(400).json({ message: "Notification ID is required" });
    }

    const notification = await prisma.notification.findUnique({
      where: {
        id: notificationId,
      },
    });

    if (!notification || notification.userId !== user.id) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      notification: serializeNotification(updatedNotification),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};