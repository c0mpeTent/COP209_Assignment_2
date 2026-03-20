import type { NotificationType } from "@prisma/client";
import prisma from "./prisma.js";

type NotificationPayload = {
  type: NotificationType;
  message: string;
  userIds: string[];
  actorId?: string;
  projectId?: string | null;
  workflowId?: string | null;
  taskId?: string | null;
  targetPath?: string | null;
};

export const buildTaskNotificationPath = (
  projectId?: string | null,
  workflowId?: string | null,
  taskId?: string | null
) => {
  if (!projectId || !workflowId || !taskId) {
    return null;
  }

  return `/project/${projectId}/workflow/${workflowId}/task/${taskId}`;
};

export const createNotifications = async ({
  type,
  message,
  userIds,
  actorId,
  projectId = null,
  workflowId = null,
  taskId = null,
  targetPath = null,
}: NotificationPayload) => {
  const uniqueUserIds = [...new Set(userIds)].filter(
    (userId) => userId && userId !== actorId
  );

  if (uniqueUserIds.length === 0) {
    return;
  }

  await prisma.$transaction(
    uniqueUserIds.map((userId) =>
      prisma.notification.create({
        data: {
          type,
          message,
          userId,
          projectId,
          workflowId,
          taskId,
          targetPath,
        },
      })
    )
  );
};