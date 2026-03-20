import type { Comment, Prisma, ProjectRole, User } from "@prisma/client";
import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  buildTaskNotificationPath,
  createNotifications,
} from "../lib/notificationService.js";

import type { AuthenticatedRequest } from "../types/auth.js";

type CommentWithAuthor = Comment & { author: User };

type MentionedUser = {
  id: string;
  name: string;
  email: string;
};

type TaskHistoryEvent = {
  event: "COMMENT_ADDED" | "COMMENT_EDITED" | "COMMENT_DELETED";
  createdAt: string;
  actorId: string;
  actorName: string;
  message: string;
  commentId?: string;
  mentions?: MentionedUser[];
};


const serializeUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const serializeComment = (comment: CommentWithAuthor) => ({
  id: comment.id,
  text: comment.text,
  taskId: comment.taskId,
  authorId: comment.authorId,
  authorName: comment.author.name,
  author: serializeUser(comment.author),
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

const extractMentionedUsers = (
  text: string,
  members: Array<{ user: User }>
): MentionedUser[] => {
  const mentionMatches = text.match(/@([a-zA-Z0-9._-]+)/g) ?? [];
  if (mentionMatches.length === 0) {
    return [];
  }

  const mentionTokens = new Set(
    mentionMatches.map((match) => match.slice(1).toLowerCase())
  );

  return members
    .map((member) => member.user)
    .filter((member) => {
      const emailToken = member.email.split("@")[0]?.toLowerCase() ?? "";
      const nameToken = member.name.toLowerCase().replace(/\s+/g, "");
      return mentionTokens.has(emailToken) || mentionTokens.has(nameToken);
    })
    .map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
    }));
};

const getTaskCommentContext = async (workflowId: string, taskId: string, userId: string) => {
  const workflow = await prisma.board.findUnique({
    where: {
      id: workflowId,
    },
    include: {
      project: {
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!workflow) {
    return null;
  }

  const userRole = workflow.project.members.find((member) => member.userId === userId)?.role;
  if (!userRole) {
    return null;
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      comments: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!task || task.boardId !== workflowId) {
    return null;
  }

  return {
    workflow,
    project: workflow.project,
    task,
    userRole,
  };
};

const appendTaskHistory = async (taskId: string, entry: TaskHistoryEvent) => {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      history: true,
    },
  });

  const existingHistory = (task?.history ?? []).filter(
    (historyEntry): historyEntry is Exclude<Prisma.JsonValue, null> => historyEntry !== null
  );

  await prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      history: [...(existingHistory as Prisma.InputJsonValue[]), entry as Prisma.InputJsonValue],
      updatedAt: new Date(),
    },
  });
};

export const getTaskComments = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user ;
    const workflowId = req.params.workflowId as string;
    const taskId = req.params.taskId as string;

    if (!workflowId || !taskId) {
      return res.status(400).json({ message: "Workflow ID and task ID are required" });
    }

    const context = await getTaskCommentContext(workflowId, taskId, user.id);
    if (!context) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({
      comments: context.task.comments.map((comment) => serializeComment(comment)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId as string; 
    const taskId = req.params.taskId as string;
    const { text } = req.body as { text?: string };

    if (!workflowId || !taskId || !text?.trim()) {
      return res.status(400).json({ message: "Workflow ID, task ID, and comment text are required" });
    }

    const context = await getTaskCommentContext(workflowId, taskId, user.id);
    if (!context) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!context.userRole || context.userRole == "PROJECT_VIEWER") {
      return res.status(403).json({ message: "User does not have permission to add comments" });
    }

    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        taskId,
        authorId: user.id,
      },
      include: {
        author: true,
      },
    });

    const mentions = extractMentionedUsers(text, context.project.members);
    await appendTaskHistory(taskId, {
      event: "COMMENT_ADDED",
      createdAt: new Date().toISOString(),
      actorId: user.id,
      actorName: user.name,
      message: `${user.name} added a comment`,
      commentId: comment.id,
      ...(mentions.length > 0 ? { mentions } : {}),
    });

    const mentionedUserIds = mentions.map((mention) => mention.id);
    const targetPath = buildTaskNotificationPath(
      context.project.id,
      workflowId,
      taskId
    );

    await createNotifications({
      type: "TASK_COMMENTED",
      message: `${user.name} commented on ${context.task.title}`,
      userIds: [context.task.reporterId, context.task.assigneeId ?? ""].filter(
        (recipientId) => recipientId && !mentionedUserIds.includes(recipientId)
      ),
      actorId: user.id,
      projectId: context.project.id,
      workflowId,
      taskId,
      targetPath,
    });

    if (mentions.length > 0) {
      await createNotifications({
        type: "TASK_MENTIONED",
        message: `${user.name} mentioned you in a comment on ${context.task.title}`,
        userIds: mentionedUserIds,
        actorId: user.id,
        projectId: context.project.id,
        workflowId,
        taskId,
        targetPath,
      });
    }

    return res.status(201).json({
      comment: serializeComment(comment),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const commentId = req.params.commentId as string ;
    const { text } = req.body as { text?: string };

    if (!commentId || !text?.trim()) {
      return res.status(400).json({ message: "Comment ID and comment text are required" });
    }

    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      include: {
        author: true,
        task: {
          include: {
            board: {
              include: {
                project: {
                  include: {
                    members: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userRole = comment.task.board.project.members.find(
      (member) => member.userId === user.id
    )?.role;

    if (!userRole) {
      return res.status(403).json({ message: "User is not a member of this project" });
    }

    if (!userRole || userRole == "PROJECT_VIEWER") {
      return res.status(403).json({ message: "User does not have permission to edit comments" });
    }

    if (comment.authorId !== user.id) {
      return res.status(403).json({ message: "Users can edit only their own comments" });
    }

    const updatedComment = await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        text: text.trim(),
      },
      include: {
        author: true,
      },
    });

    const mentions = extractMentionedUsers(text, comment.task.board.project.members);
    await appendTaskHistory(comment.taskId, {
      event: "COMMENT_EDITED",
      createdAt: new Date().toISOString(),
      actorId: user.id,
      actorName: user.name,
      message: `${user.name} edited a comment`,
      commentId: updatedComment.id,
      ...(mentions.length > 0 ? { mentions } : {}),
    });

    return res.status(200).json({
      comment: serializeComment(updatedComment),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const commentId = req.params.commentId as string ;

    if (!commentId) {
      return res.status(400).json({ message: "Comment ID is required" });
    }

    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId ,
      },
      include: {
        task: {
          include: {
            board: {
              include: {
                project: {
                  include: {
                    members: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userRole = comment.task.board.project.members.find(
      (member) => member.userId === user.id
    )?.role;

    if (!userRole) {
      return res.status(403).json({ message: "User is not a member of this project" });
    }

    if (!userRole || userRole === "PROJECT_VIEWER") {
      return res.status(403).json({ message: "User does not have permission to delete comments" });
    }

    if (comment.authorId !== user.id) {
      return res.status(403).json({ message: "Users can delete only their own comments" });
    }

    await appendTaskHistory(comment.taskId, {
      event: "COMMENT_DELETED",
      createdAt: new Date().toISOString(),
      actorId: user.id,
      actorName: user.name,
      message: `${user.name} deleted a comment`,
      commentId,
    });

    await prisma.comment.delete({
      where: {
        id: commentId,
      },
    });

    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};611