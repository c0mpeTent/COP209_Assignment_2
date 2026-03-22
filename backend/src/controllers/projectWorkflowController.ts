import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { type Comment ,type Column , type Prisma , type ProjectRole , type Task as PrismaTask , type User, TaskType } from "@prisma/client";

import { deriveStoryStatusId, getColumnOrderUpdates , getLifecycleDatesForStatus, parseDueDate } from "../lib/workflowUtils.js";
import type { AuthenticatedRequest } from "../types/auth.js";
import { serialize } from "node:v8";
import {
  buildTaskNotificationPath,
  createNotifications,
} from "../lib/notificationService.js";
type TaskWithRelation = PrismaTask& {assignee: User | null ; reporter: User | null};
type TaskHistoryEventType =
  | "STATUS_CHANGE"
  | "ASSIGNEE_CHANGE"
  | "TASK_UPDATED"
  | "STORY_LINK_CHANGE"
  | "COMMENT_ADDED"
  | "COMMENT_EDITED"
  | "COMMENT_DELETED";

type MentionedUser = {
  id: string;
  name: string;
  email: string;
};
type BoardInvalidTransition = {
  id: string;
  fromColumnId: string;
  toColumnId: string;
  createdAt: Date;
};

type TaskHistoryEntry = {
  event: TaskHistoryEventType;
  createdAt: string;
  actorId: string;
  actorName: string;
  message: string;
  oldValue?: string | null;
  newValue?: string | null;
  commentId?: string;
  mentions?: MentionedUser[];
};
const serializeInvalidTransition = (transition: BoardInvalidTransition) => ({
  id: transition.id,
  fromColumnId: transition.fromColumnId,
  toColumnId: transition.toColumnId,
  createdAt: transition.createdAt,
});

const buildHistoryEntry = (
  event: TaskHistoryEventType,
  actor: Pick<User, "id" | "name">,
  message: string,
  options: {
    oldValue?: string | null;
    newValue?: string | null;
    commentId?: string;
    mentions?: MentionedUser[];
  } = {}
): TaskHistoryEntry => ({
  event,
  createdAt: new Date().toISOString(),
  actorId: actor.id,
  actorName: actor.name,
  message,
  ...(options.oldValue !== undefined ? { oldValue: options.oldValue } : {}),
  ...(options.newValue !== undefined ? { newValue: options.newValue } : {}),
  ...(options.commentId ? { commentId: options.commentId } : {}),
  ...(options.mentions && options.mentions.length > 0
    ? { mentions: options.mentions }
    : {}),
});

const appendTaskHistory = async (taskId: string, entry: TaskHistoryEntry) => {
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
      history: [
        ...(existingHistory as Prisma.InputJsonValue[]),
        entry as Prisma.InputJsonValue,
      ],
      updatedAt: new Date(),
    },
  });
};



const serializeUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const serializeTask = (
  task: TaskWithRelation
) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  type: task.type,
  status: task.statusId,
  priority: task.priority,
  assignee: task.assignee ? serializeUser(task.assignee) : null,
  reporterId: task.reporterId,
  reporter: task.reporter ? serializeUser(task.reporter) : null,
  dueDate: task.dueDate,
  parentStoryId: task.parentStoryId,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  resolvedAt: task.resolvedAt,
  closedAt: task.closedAt,
  comments:  [],
  history: [],
});

const getLifecycleDates = async (
  boardId: string,
  statusId: string,
  currentResolvedAt: Date | null,
  currentClosedAt: Date | null
) => {
  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
    select: {
      resolvedColumnId: true,
    },
  });
  const columns = await prisma.column.findMany({
    where: {
      boardId: boardId
    },
    orderBy: {
      order: "asc"
    }
  });
  return getLifecycleDatesForStatus(
    columns.map((column) => ({
      id: column.id,
      name: column.name,
      order: column.order,
      wipLimit: column.wipLimit,
    })),
    statusId,
    currentResolvedAt,
    currentClosedAt,
    board?.resolvedColumnId === statusId ? new Date() : undefined
  );
};
const getInitialStoryColumn = async (boardId: string) => {
  const columns = await prisma.column.findMany({
    where: {
      boardId: boardId
    },
    orderBy: {
      order: "asc"
    }
  });
  const firstColumn = columns[0];

  if (!firstColumn) {
    throw new Error("Workflow must have at least one column");
  }

  return firstColumn;
};

const enforceWipLimit = async (
  targetColumn: Column,
  taskIdToIgnore?: string
) => {
  const taskCount = await prisma.task.count({
    where: {
      statusId: targetColumn.id,
      type: {
        not: "STORY",
      },
      ...(taskIdToIgnore
        ? {
            id: {
              not: taskIdToIgnore,
            },
          }
        : {}),
    },
  });

  if (targetColumn.wipLimit !== null && targetColumn.wipLimit <= taskCount) {
    throw new Error(`WIP limit reached for ${targetColumn.name}`);
  }
};

const validateStatusTransition = async (
  boardId: string,
  currentStatusId: string,
  nextStatusId: string
) => {
  if (currentStatusId === nextStatusId) {
    return;
  }

  const [currentColumn, nextColumn] = await Promise.all([
    await prisma.column.findUnique({
      where: {
        id: currentStatusId,
      },
    }),
    await prisma.column.findUnique({
      where: {
        id: nextStatusId,
      },
    }),
  ]);

  if (!currentColumn || !nextColumn) {
    throw new Error("Invalid status transition");
  }

  const transitionConfig = await getBoardTransitionConfig(boardId);
  if (!transitionConfig) {
    throw new Error("Workflow not found");
  }

  if (
    transitionConfig.leftToRightOnly &&
    currentColumn.order >= nextColumn.order
  ) {
    throw new Error("Invalid status transition. This workflow only allows left-to-right moves.");
  }

  if (transitionConfig.leftToRightOnly) {
    return;
  }

  const isExplicitlyInvalid = transitionConfig.invalidTransitions.some(
    (transition) =>
      transition.fromColumnId === currentStatusId &&
      transition.toColumnId === nextStatusId
  );

  if (isExplicitlyInvalid) {
    throw new Error(
      `Invalid status transition from ${currentColumn.name} to ${nextColumn.name}.`
    );
  }

};

const syncStoryStatus = async (
  storyId: string,
  actor?: Pick<User, "id" | "name">
) => {
  const story = await prisma.task.findUnique({
    where: {
      id: storyId,
    },
  });

  if (!story || story.type !== "STORY") {
    return null;
  }

  const columns = await prisma.column.findMany({
    where: {
      boardId: story.boardId,
    },
    orderBy: {
      order: "asc",
    },
  });

  const firstColumn = columns[0];

  if (!firstColumn) {
    return null;
  }

  const childTasks = await prisma.task.findMany({
    where: {
      parentStoryId: storyId,
    },
    include: {
      status: true,
    },
  });

  const nextStatusId = deriveStoryStatusId(
    columns.map((column) => ({
      id: column.id,
      name: column.name,
      order: column.order,
      wipLimit: column.wipLimit,
    })),
    childTasks.map((childTask) => childTask.statusId)
  );

  if (!nextStatusId) {
    return null;
  }

  if (story.statusId === nextStatusId) {
    return story;
  }

  const previousColumn = columns.find((column) => column.id === story.statusId);
  const nextColumn = columns.find((column) => column.id === nextStatusId);

  const lifecycleDates = await getLifecycleDates(
    story.boardId,
    nextStatusId,
    story.resolvedAt,
    story.closedAt
  );

  const updatedStory = await prisma.task.update({
    where: {
      id: storyId,
    },
    data: {
      statusId: nextStatusId,
      resolvedAt: lifecycleDates.resolvedAt,
      closedAt: lifecycleDates.closedAt,
    },
  });
  if (actor && previousColumn && nextColumn) {
    await appendTaskHistory(
      storyId,
      buildHistoryEntry(
        "STATUS_CHANGE",
        actor,
        `${actor.name} updated child work items and moved ${story.title} from ${previousColumn.name} to ${nextColumn.name}`,
        {
          oldValue: previousColumn.name,
          newValue: nextColumn.name,
        }
      )
    );
  }

  return updatedStory;
};

const getBoardTransitionConfig = async (boardId: string) => {
  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
    include: {
      invalidTransitions: true,
    },
  });

  if (!board) {
    return null;
  }

  return {
    leftToRightOnly: Boolean(board.leftToRightOnly),
    invalidTransitions: board.invalidTransitions,
  };
};

export const createWorkflow = async (req: Request, res: Response) => {
    try {
        // console.log(req.body);
        const user = (req as AuthenticatedRequest).user;
        const workflowName = req.body.name;
        const projectId = req.body.projectId;
        const project = await prisma.project.findUnique({
            where: {
                id: projectId
            },
            include: {
                members: true
            }
        });
        // console.log(project);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const memberRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!memberRole) {
            return res.status(403).json({ message: "User is not a member of this project" });
        }
        if (memberRole === "PROJECT_MEMBER" || memberRole === "PROJECT_VIEWER") {
            return res.status(403).json({ message: "User is not allowed to create workflow" });
        }
        // console.log(memberRole);
        const workflow = await prisma.board.create({
            data: {
                name: workflowName,
                projectId: projectId,
                leftToRightOnly: false
            },
            
        });
        const todoColumn = await prisma.column.create({
            data:{
                name : "To Do",
                order : 0,
                wipLimit : 10,
                boardId : workflow.id
            }
        });
        const inProgressColumn = await prisma.column.create({
            data:{
                name : "In Progress",
                order : 1,
                wipLimit : 10,
                boardId : workflow.id
            }
        });
        const ReviewColumn = await prisma.column.create({
            data:{
                name : "Review",
                order : 2,
                wipLimit : 10,
                boardId : workflow.id
            }
        });
        const DoneColumn = await prisma.column.create({
            data:{
                name : "Done",
                order : 3,
                wipLimit : 10,
                boardId : workflow.id
            }
        });

        return res.status(201).json(workflow);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getWorkflow = async (req: Request, res: Response) => {
    try {
        const user = (req as AuthenticatedRequest).user;
        const workflowId = req.params.workflowId;
        if (typeof workflowId !== 'string') {
            return res.status(400).json({ message: "Invalid workflow ID" });
        }
        const workflow = await prisma.board.findUnique({
            where: {
                id: workflowId
            },
            include: {
                invalidTransitions: true,
                columns: {
                    orderBy: {
                        order: "asc"
                    }
                },
                tasks: {
                    include: {
                        assignee: true,
                        reporter: true
                    }
                }
            }
        });
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const project = await prisma.project.findUnique({
            where: {
                id: workflow.projectId
            },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User is not a member of this project" });
        }
        return res.status(200).json({
            id: workflow.id,
            name: workflow.name,
            userRole: userRole,
            currentUserId: user.id,
            leftToRightOnly: Boolean(workflow.leftToRightOnly),
            resolvedColumnId: workflow.resolvedColumnId ?? null,
            columns: workflow.columns,
            invalidTransitions: workflow.invalidTransitions.map((transition) =>
                serializeInvalidTransition(transition)
            ),
            tasks: workflow.tasks.map((task) => serializeTask(task)),
            members: project.members.map((member) => ({
                id: member.user.id,
                name: member.user.name,
                email: member.user.email
            }))
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getTaskDetails = async (req : Request , res : Response) => {
    try {
        const user = (req as AuthenticatedRequest).user;
        const workflowId = req.params.workflowId;
        const taskId = req.params.taskId;

        if (!workflowId || !taskId) {
            return res.status(400).json({ message: "Missing workflowId or taskId" });
        }
        const workflow = await prisma.board.findUnique(
            {
                where: {
                    id : workflowId as string 
                },
                include: {
                    invalidTransitions: true,
                }
            }
        );
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const task = await prisma.task.findUnique({
            where: {
                id : taskId as string
            },
            include: {
                assignee: true,
                reporter: true
            }
        });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        const columns = await prisma.column.findMany(
            {
                where: {
                    boardId: workflowId as string
                },
                orderBy: {
                    order: "asc"
                }
            }
        );
        if (!columns) {
            return res.status(404).json({ message: "Columns not found" });
        }
        const project = await prisma.project.findUnique({
            where: {
                id: workflow.projectId
            },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        };
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User is not a member of this project" });
        }
        const childItems =
          task.type === "STORY"
          ? await prisma.task.findMany({
              where: {
                parentStoryId: task.id,
              },
              include: {
                assignee: true,
                reporter: true,
              },
              orderBy: {
                updatedAt: "desc",
              },
            })
          : [];
        const stories = await prisma.task.findMany({
          where: {
            boardId: workflowId as string,
            type: "STORY",
            ...(task.type === "STORY"
              ? {
                  id: {
                    not: task.id,
                  },
                }
              : {}),
          },
          include: {
            assignee: true,
            reporter: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        });
        res.status(200).json(
            {
                id : task.id,
                task : serializeTask(task),
                childItems: childItems.map((childItem) => serializeTask(childItem)),
                stories: stories.map((story) => serializeTask(story)),
                workflowName : workflow.name,
                projectId : project.id,
                userRole : userRole,
                currentUserId : user.id,
                columns: columns,
                members: project.members.map((member) => ({
                    id: member.userId,
                    name: member.user.name,
                    email: member.user.email,
                    avatarUrl: member.user.avatarUrl
                }))

            }
        )

    }catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateTransitionRules = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId;
    const { leftToRightOnly } = req.body as { leftToRightOnly?: boolean };

    if (!workflowId || typeof leftToRightOnly !== "boolean") {
      return res.status(400).json({ message: "Workflow ID and transition mode are required" });
    }

    const workflow = await prisma.board.findUnique({
        where:{
            id : workflowId as string 
        },
        include:{
            invalidTransitions:true
        }
    });
    if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
    }
    const project = await prisma.project.findUnique({
        where:{
            id : workflow.projectId
        },
        include:{
            members: true
        }
    });
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }
    const userRole = project.members.find((member) => member.userId === user.id)?.role;
    if (!userRole) {
        return res.status(403).json({ message: "User does not have permission to delete tasks" });
    }
    if (userRole === "PROJECT_VIEWER") {
        return res.status(403).json({ message: "User does not have permission to delete tasks" });
    }
    const board = await prisma.board.update({
      where: {
        id: workflowId as string ,
      },
      data: {
        leftToRightOnly,
      },
      include: {
        invalidTransitions: true,
      },
    });

    return res.status(200).json({
      id: board.id,
      leftToRightOnly: Boolean(board.leftToRightOnly),
      invalidTransitions: board.invalidTransitions.map((transition) =>
        serializeInvalidTransition(transition)
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateResolvedColumn = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId;
    const { resolvedColumnId } = req.body as { resolvedColumnId?: string | null };

    if (!workflowId || resolvedColumnId === undefined) {
      return res.status(400).json({
        message: "Workflow ID and resolved column are required",
      });
    }

     const workflow = await prisma.board.findUnique(
            {
                where: {
                    id : workflowId as string 
                },
                include: {
                    invalidTransitions: true,
                }
            }
        );
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const project = await prisma.project.findUnique({
            where: {
                id: workflow.projectId
            },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        };
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User is not a member of this project" });
        }

    if (resolvedColumnId !== null) {
      const resolvedColumn = await prisma.column.findUnique({
        where: {
          id: resolvedColumnId
        }
      });
      if (!resolvedColumn) {
        return res.status(400).json({ message: "Invalid resolved column" });
      }
    }

    const board = await prisma.board.update({
      where: {
        id: workflowId as string,
      },
      data: {
        resolvedColumnId,
      },
    });

    return res.status(200).json({
      id: board.id,
      resolvedColumnId: board.resolvedColumnId ?? null,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addInvalidTransition = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId;
    const { fromColumnId, toColumnId } = req.body as {
      fromColumnId?: string;
      toColumnId?: string;
    };

    if (!workflowId || !fromColumnId || !toColumnId) {
      return res.status(400).json({ message: "Workflow ID, from status, and to status are required" });
    }

    if (fromColumnId === toColumnId) {
      return res.status(400).json({ message: "A transition must point to a different status" });
    }

     const workflow = await prisma.board.findUnique(
            {
                where: {
                    id : workflowId as string 
                },
                include: {
                    invalidTransitions: true,
                }
            }
        );
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const project = await prisma.project.findUnique({
            where: {
                id: workflow.projectId
            },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        };
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User is not a member of this project" });
        }
    const [fromColumn, toColumn] = await Promise.all([
      prisma.column.findUnique({
        where: {
          id: fromColumnId
        }
      }),
      prisma.column.findUnique({
        where: {
          id: toColumnId
        }
      }),
    ]);

    if (!fromColumn || !toColumn) {
      return res.status(400).json({ message: "Invalid workflow statuses selected" });
    }

    const existingTransition = await prisma.invalidTransition.findFirst({
      where: {
        boardId: workflowId as string,
        fromColumnId: fromColumnId as string,
        toColumnId: toColumnId as string,
      },
    });

    if (existingTransition) {
      return res.status(400).json({ message: "This invalid transition already exists" });
    }

    const transition = await prisma.invalidTransition.create({
      data: {
        boardId: workflowId as string,
        fromColumnId: fromColumnId as string,
        toColumnId: toColumnId as string,
      },
    });

    return res.status(201).json(serializeInvalidTransition(transition));
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteInvalidTransition = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId;
    const transitionId = req.params.transitionId;

    if (!workflowId || !transitionId) {
      return res.status(400).json({ message: "Workflow ID and transition ID are required" });
    }

     const workflow = await prisma.board.findUnique(
            {
                where: {
                    id : workflowId as string 
                },
                include: {
                    invalidTransitions: true,
                }
            }
        );
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const project = await prisma.project.findUnique({
            where: {
                id: workflow.projectId
            },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        };
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User is not a member of this project" });
        }

    const transition = await prisma.invalidTransition.findUnique({
      where: {
        id: transitionId as string ,
      },
    });

    if (!transition || transition.boardId !== workflowId) {
      return res.status(404).json({ message: "Invalid transition not found" });
    }

    await prisma.invalidTransition.delete({
      where: {
        id: transitionId as string,
      },
    });

    return res.status(200).json({ message: "Invalid transition removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const updateWorkflow = async (req: Request, res: Response) => {
    try {
        const user = (req as AuthenticatedRequest).user;
        const workflowId = req.params.workflowId;
        const workflowName = req.body.name;
        if (!workflowId) return res.status(400).json({ message: "Workflow ID is required" });
        const workflow = await prisma.board.findUnique({
            where: {
                id: workflowId as string
            },
            include: {
                invalidTransitions: true,
            }
        });
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const userMember = await prisma.projectMember.findUnique({
            where:{
                userId_projectId:{
                    userId: user.id,
                    projectId: workflow.projectId
                }
            }
        });
        if (!userMember) {
            return res.status(403).json({ message: "You are not a member of this project" });
        }
        if (userMember.role === "PROJECT_MEMBER" || userMember.role === "PROJECT_VIEWER") {
            return res.status(403).json({ message: "You do not have permission to update this workflow" });
        }
        const updatedWorkflow = await prisma.board.update({
            where: {
                id : workflow.id
            },
            data: {
                name: workflowName
            }
        });

        res.status(200).json(updatedWorkflow );
    }catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const createTask = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const workflowId = req.body.workflowId;
        const taskName = req.body.title;
        const taskType = req.body.type;
        const taskDescription = req.body.description;
        const taskPriority = req.body.priority;
        const taskDueDate = req.body.dueDate;
        const taskStatus = req.body.status;
        const parentStoryId = req.body.parentStoryId ? req.body.parentStoryId :null;
        const assignEmail = req.body.assignee;
        const workflow = await prisma.board.findUnique({
            where:{
                id : workflowId
            },
            include:{
                invalidTransitions:true
            }
        })
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const project = await prisma.project.findUnique({
            where:{
                id : workflow.projectId
            },
            include:{
                members:true
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User is not a member of this project" });
        }
        if (userRole === "PROJECT_VIEWER") {
            return res.status(403).json({ message: "User does not have permission to create tasks" });
        }
     
       
        const assigneeObject = (assignEmail) ? await prisma.user.findUnique(
            {
                where:{
                    email: assignEmail
                }
            }
        ) : null;
        if (assignEmail && !assigneeObject) return res.status(403).json({message: "assignee not found "});
        const assigneeId = assigneeObject?.id??null;

        const parsedDate = parseDueDate(taskDueDate);
        
        if (taskType == "STORY" && parentStoryId){
            return res.status(400).json({ message: "Stories cannot be children of other tasks" });
        };
        let parentStory = null;
        if (taskType != "STORY" && parentStoryId){
            parentStory = await prisma.task.findUnique({
                where:{
                    id: parentStoryId
                }
            });
            if (!parentStory) {
                return res.status(404).json({ message: "Parent story not found" });
            }
        };

        const statusColumn = ((taskType === "STORY") 
            ? await getInitialStoryColumn(workflowId)
            : await prisma.column.findUnique({
                where:{
                    id: taskStatus
                }
            }));
        if (!statusColumn) {
            return res.status(404).json({ message: "Status column not found" });
        }

        if (taskType !== "STORY"){
            await enforceWipLimit( statusColumn);
        }
        const lifecycleDates = await getLifecycleDates(workflowId, statusColumn.id,null,null);

        const task = await prisma.task.create({
            data: {
                title: taskName,
                description: taskDescription,
                type: taskType,
                statusId: taskStatus,
                priority: taskPriority,
                dueDate: parsedDate,
                boardId: workflowId,
                reporterId: user.id,
                parentStoryId: parentStoryId ?? null,
                assigneeId: assigneeId,
                resolvedAt: lifecycleDates.resolvedAt,
                closedAt: lifecycleDates.closedAt,
                history: [],
            },
            include: {
                assignee: true,
                reporter: true
            }
        });

        if (assigneeObject) {
          await createNotifications({
            type: "TASK_ASSIGNED",
            message: `${user.name} assigned you to ${task.title}`,
            userIds: [assigneeObject.id],
            actorId: user.id,
            projectId: workflow.projectId,
            workflowId,
            taskId: task.id,
            targetPath: buildTaskNotificationPath(workflow.projectId, workflowId, task.id),
          });
        }
        await createNotifications({
          type: "TASK_CREATED",
          message: `${user.name} created ${taskType.toLowerCase()} ${task.title}`,
          userIds: project.members.map((member) => member.userId),
          actorId: user.id,
          projectId: workflow.projectId,
          workflowId,
          taskId: task.id,
          targetPath: buildTaskNotificationPath(workflow.projectId, workflowId, task.id),
        });

        if (parentStory) {
          await createNotifications({
            type: "TASK_LINKED_TO_STORY",
            message: `${user.name} assigned ${task.title} to story ${parentStory.title}`,
            userIds: project.members.map((member) => member.userId),
            actorId: user.id,
            projectId: project.id,
            workflowId,
            taskId: task.id,
            targetPath: buildTaskNotificationPath(project.id, workflowId, task.id),
          });
        }

        if (taskType !== "STORY" && parentStoryId) {
            await syncStoryStatus(parentStoryId,user);
        }
        return res.status(201).json(serializeTask(task));
    } catch (error) {
        console.error("Error creating task:", error); // Add this line
    res.status(500).json({ 
        message: "Internal server error", 
        error: error // Also include error in response for debugging
    });
    }
}
export const deleteTask = async (req : Request, res : Response) => {
    try {
        const user = (req as any).user ;
        const taskId = req.params.taskId;
        const workflowId = req.params.workflowId;
        if (!taskId || typeof taskId !== 'string') {
            return res.status(400).json({ message: "Invalid task ID" });
        }
        if (!workflowId || typeof workflowId !== 'string') {
            return res.status(400).json({ message: "Invalid workflow ID" });
        }
        const workflow = await prisma.board.findUnique({
            where:{
                id : workflowId
            },
            include:{
                invalidTransitions:true
            }
        });
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const project = await prisma.project.findUnique({
            where:{
                id : workflow.projectId
            },
            include:{
                members: true
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User does not have permission to delete tasks" });
        }
        const task = await prisma.task.findUnique({
            where:{
                id : taskId
            }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        if (userRole === "PROJECT_VIEWER" || (userRole === "PROJECT_MEMBER" && task?.reporterId !== user.id)) {
            return res.status(403).json({ message: "User does not have permission to delete tasks" });
        }
        const taskIdsToDelete =
          task.type === "STORY"
            ? [
                taskId,
                ...(
                  await prisma.task.findMany({
                    where: {
                      parentStoryId: taskId,
                    },
                    select: {
                      id: true,
                    },
                  })
                ).map((childTask) => childTask.id),
              ]
            : [taskId];
        const actorRoleLabel = userRole.replace(/_/g, " ");
        const deletionTargetPath = project.id
          ? `/project/${project.id}/workflow/${workflowId}`
          : null;

        await prisma.comment.deleteMany({
          where: {
            taskId: {
              in: taskIdsToDelete,
            },
          },
        });
        if (task.type === "STORY"){
            await prisma.task.deleteMany({
                where:{
                    id: {
                        in: taskIdsToDelete.filter((id) => id !== taskId),
                    }
                }
            })
        };

        await prisma.task.delete({
            where:{
                id: taskId
            }
        });

        await createNotifications({
            type: "TASK_DELETED",
            message: `${user.name} (${actorRoleLabel}) deleted ${task.type.toLowerCase()} ${task.title}`,
            userIds: project.members.map((member) => member.userId),
            actorId: user.id,
            projectId: project.id,
            workflowId,
            taskId: null,
            targetPath: deletionTargetPath,
          });
        if (task.parentStoryId) {
            await syncStoryStatus(task.parentStoryId,user);
        }
        return res.status(200).json({message: "Task deleted successfully"});
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}
export const changeTask = async (req : Request, res : Response) => {
    try {
        const user = (req as AuthenticatedRequest).user ;
        const taskId = req.params.taskId;
        const workflowId = req.params.workflowId;
        if (!workflowId || typeof workflowId !== 'string' || !taskId || typeof taskId !== 'string') {
            return res.status(400).json({ message: "Workflow ID and Task ID are required" });
        }
        const workflow = await prisma.board.findUnique({
            where:{
                id : workflowId
            },
            include:{
                invalidTransitions:true
            }
        });
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const project = await prisma.project.findUnique({
            where:{
                id : workflow.projectId
            },
            include:{
                members: true
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User does not have permission to change task" });
        }
        if (userRole === "PROJECT_VIEWER") {
            return res.status(403).json({ message: "User does not have permission to change task" });
        }
        const {
            title,
            description,
            status,
            priority,
            assignee,
            dueDate,
            parentStoryId,
            } = req.body
        const exitingTask = await prisma.task.findUnique({
            where:{
                id : taskId as string
            },
            include: {
              assignee: true
            }
            
        });
        if (!exitingTask) {
            return res.status(404).json({ message: "Task not found" });
        };
        const updateData: Prisma.TaskUncheckedUpdateInput = {};
        let statusHistoryEntry: TaskHistoryEntry | null = null;
        let assigneeHistoryEntry: TaskHistoryEntry | null = null;
        let editHistoryEntry: TaskHistoryEntry | null = null;
        let storyAssignmentHistoryEntry: TaskHistoryEntry | null = null;
        let statusNotificationPayload:
          | Parameters<typeof createNotifications>[0]
          | null = null;
        let assignmentNotificationPayload:
          | Parameters<typeof createNotifications>[0]
          | null = null;
        let storyAssignmentNotificationPayload:
        | Parameters<typeof createNotifications>[0]
        | null = null;
      const updatedFields: string[] = [];
        updateData.title = title;
        if ( title != exitingTask.title) {
            updatedFields.push("title");
        }
        updateData.description = description;
        if ( description != exitingTask.description) {
            updatedFields.push("description");
        }
        updateData.priority = priority;
        if ( priority != exitingTask.priority) {
            updatedFields.push("priority");
        }
       

        if ( status !== undefined){
            const nextColumn = await prisma.column.findUnique({
                where:{
                    id: status
                }
            });
            if (!nextColumn) {
                return res.status(404).json({ message: "Column not found" });
            };
            const currentColumn = await prisma.column.findUnique({
                where:{
                    id: exitingTask.statusId
                }
            });
            if (!currentColumn) {
                return res.status(404).json({ message: "Column not found" });
            };
            if (exitingTask.type !== "STORY") {
                await validateStatusTransition(workflowId, exitingTask.statusId, nextColumn.id);
                await enforceWipLimit(nextColumn, exitingTask.id);
            };
            updateData.statusId = nextColumn.id;
            const lifecycleDates = await getLifecycleDates(
                workflowId,
                nextColumn.id,
                exitingTask.resolvedAt,
                exitingTask.closedAt
            );
            updateData.resolvedAt = lifecycleDates.resolvedAt;
            updateData.closedAt = lifecycleDates.closedAt;

            if (exitingTask.statusId !== nextColumn.id) {
              statusHistoryEntry = buildHistoryEntry(
                "STATUS_CHANGE",
                user,
                `${user.name} moved ${exitingTask.title} from ${currentColumn.name} to ${nextColumn.name}`,
                {
                  oldValue: currentColumn.name,
                  newValue: nextColumn.name,
                }
              );

              statusNotificationPayload = {
                type: "TASK_STATUS_CHANGED",
                message: `${user.name} moved ${exitingTask.title} to ${nextColumn.name}`,
                userIds: [exitingTask.reporterId, exitingTask.assigneeId ?? ""],
                actorId: user.id,
                projectId: project.id,
                workflowId,
                taskId,
                targetPath: buildTaskNotificationPath(project.id, workflowId, taskId),
            };
          };
        };
        updateData.dueDate = parseDueDate(dueDate);
        if ( updateData.dueDate != exitingTask.dueDate) {
            updatedFields.push("due date");
        }
        if ( assignee !== undefined){
            const assigneeObject = await prisma.user.findUnique({
                where: {
                    email : assignee
                }
            })
            updateData.assigneeId = assigneeObject?.id ?? null;
            if (exitingTask.assigneeId !== (assigneeObject?.id ?? null)) {
            assigneeHistoryEntry = buildHistoryEntry(
              "ASSIGNEE_CHANGE",
              user,
              `${user.name} changed assignee from ${exitingTask.assignee?.name ?? "Unassigned"} to ${assigneeObject?.name ?? "Unassigned"}`,
              {
                oldValue: exitingTask.assignee?.name ?? null,
                newValue: assigneeObject?.name ?? null,
              }
            );

            if (assigneeObject) {
              assignmentNotificationPayload = {
                type: "TASK_ASSIGNED",
                message: `${user.name} assigned you to ${exitingTask.title}`,
                userIds: [assigneeObject.id],
                actorId: user.id,
                projectId: workflow.projectId,
                workflowId,
                taskId,
                targetPath: buildTaskNotificationPath(workflow.projectId, workflowId, taskId),
              };
            };
          };
        }

        if ("parentStoryId" in req.body) {
          if (exitingTask.type === "STORY" && parentStoryId) {
            return res.status(400).json({
              message: "Stories cannot be children of other stories",
            });
          }

          const normalizedParentStoryId =
            typeof parentStoryId === "string" && parentStoryId.trim() === ""
              ? null
              : (parentStoryId ?? null);
          const previousParentStoryId = exitingTask.parentStoryId ?? null;

          const nextParentStory =
            exitingTask.type !== "STORY"
              ? await prisma.task.findUnique({
                  where: {
                    id: normalizedParentStoryId,
                  },
                })
              : null;
          const nextParentStoryId = nextParentStory?.id ?? null;

          if (previousParentStoryId !== nextParentStoryId) {
            updateData.parentStoryId = nextParentStoryId;

            const previousStoryTitle = previousParentStoryId
              ? (
                  await prisma.task.findUnique({
                    where: {
                      id: previousParentStoryId,
                    },
                    select: {
                      title: true,
                    },
                  })
                )?.title ?? null
              : null;
            const nextStoryTitle = nextParentStory?.title ?? null;

            storyAssignmentHistoryEntry = buildHistoryEntry(
              "STORY_LINK_CHANGE",
              user,
              nextStoryTitle
                ? `${user.name} assigned ${exitingTask.title} to story ${nextStoryTitle}`
                : `${user.name} removed ${exitingTask.title} from story ${previousStoryTitle ?? "Unknown story"}`,
              {
                oldValue: previousStoryTitle,
                newValue: nextStoryTitle,
              }
            );

            if (nextStoryTitle) {
              storyAssignmentNotificationPayload = {
                type: "TASK_LINKED_TO_STORY",
                message: `${user.name} assigned ${exitingTask.title} to story ${nextStoryTitle}`,
                userIds: project.members.map((member) => member.userId),
                actorId: user.id,
                projectId: project.id,
                workflowId,
                taskId,
                targetPath: buildTaskNotificationPath(project.id, workflowId, taskId),
              };
            }
          }
        }


        const updatedTask = await prisma.task.update({
            where: {
                id: exitingTask.id
            },
            data: updateData,
            include: {
                assignee: true,
                reporter: true,
            },
        });

        if (updatedFields.length > 0) {
          editHistoryEntry = buildHistoryEntry(
            "TASK_UPDATED",
            user,
            `${user.name} updated ${updatedFields.join(", ")} for ${updatedTask.title}`
          );
        }

        if (statusHistoryEntry) {
          await appendTaskHistory(taskId, statusHistoryEntry);
        }

        if (assigneeHistoryEntry) {
          await appendTaskHistory(taskId, assigneeHistoryEntry);
        }

        if (editHistoryEntry) {
          await appendTaskHistory(taskId, editHistoryEntry);
        }

        if (storyAssignmentHistoryEntry) {
          await appendTaskHistory(taskId, storyAssignmentHistoryEntry);
        }

        if (statusNotificationPayload) {
          await createNotifications(statusNotificationPayload);
        }

        if (assignmentNotificationPayload) {
          await createNotifications(assignmentNotificationPayload);
        }
        if (storyAssignmentNotificationPayload) {
      await createNotifications(storyAssignmentNotificationPayload);
    }

    if ("parentStoryId" in req.body && exitingTask.parentStoryId !== updatedTask.parentStoryId) {
      if (exitingTask.parentStoryId) {
        await syncStoryStatus(exitingTask.parentStoryId, user);
      }

      if (updatedTask.parentStoryId) {
        await syncStoryStatus(updatedTask.parentStoryId, user);
      }
    } else if (updatedTask.parentStoryId) {
      await syncStoryStatus(updatedTask.parentStoryId, user);
    }

      return res.status(200).json(serializeTask(updatedTask));
    } catch (error) {
      console.error("Error updating task:", error);
        res.status(500).json({ message: "Internal server error" , error});
    }
}

export const addColumn = async (req : Request, res : Response) => {
    try {
        const user = (req as AuthenticatedRequest).user ;
        const title: string = req.body.title;
        const wipLimit: number = req.body.wipLimit;
        const workflowId = req.params.workflowId;

        if (!workflowId || typeof workflowId !== 'string' || !title) {
            return res.status(400).json({ message: "Workflow ID and title are required" });
        }
        const workflow = await prisma.board.findUnique({
            where:{
                id : workflowId
            },
            include: {
                    invalidTransitions: true,
            }
        });
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const project = await prisma.project.findUnique({
            where:{
                id : workflow.projectId
            },
            include:{
                members: true
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User does not have permission to add column" });
        }
        if (userRole === "PROJECT_VIEWER" || userRole === "PROJECT_MEMBER") {
            return res.status(403).json({ message: "User does not have permission to add column" });
        }
        const lastColumn = await prisma.column.findFirst({
            where:{
                boardId : workflowId
            },
            orderBy:{
                order : "desc"
            }
        });
        const order = lastColumn?.order ? lastColumn.order + 1 : 0;
        const newColumn = await prisma.column.create({
            data:{
                name : title,
                order : order,
                wipLimit : wipLimit,
                boardId : workflowId
            }
        });
        return res.status(200).json(newColumn);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const updateColumn = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId;
    const columnId = req.params.columnId;

    if (!workflowId || !columnId) {
      return res.status(400).json({ message: "Workflow ID and column ID are required" });
    }

    const workflow = await prisma.board.findUnique({
      where: {
        id: workflowId as string
      },
      include: {
        invalidTransitions: true,
      }
    });
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    const userMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: workflow.projectId
        }
      }
    });
    if (!userMember) {
      return res.status(403).json({ message: "User is not a member of this project" });
    };
    const userRole = userMember.role;
    if ( userRole === "PROJECT_VIEWER" || userRole === "PROJECT_MEMBER") {
      return res.status(403).json({ message: "User does not have permission to update column" });
    }
    const column = await prisma.column.findUnique({
      where: {
        id: columnId as string
      }
    });
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    const data: Prisma.ColumnUncheckedUpdateInput = {};
    if (typeof req.body.title === "string" && req.body.title.trim()) {
      data.name = req.body.title.trim();
    }

    if (req.body.wipLimit !== undefined) {
      data.wipLimit = Number(req.body.wipLimit);
    }

    if (req.body.order !== undefined) {
      data.order = Number(req.body.order);
    }

    const updatedColumn = await prisma.column.update({
      where: {
        id: columnId as string,
      },
      data,
    });

    return res.status(200).json(updatedColumn);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const reorderColumns = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId;
    const columnIds = req.body.columnIds as string[];
    // console.log(columnIds);
    if (!workflowId || !Array.isArray(columnIds) || columnIds.length === 0) {
      return res.status(400).json({ message: "Workflow ID and column order are required" });
    }

    const workflow = await prisma.board.findUnique({
      where: {
        id: workflowId as string,
      },
      include: {
        invalidTransitions: true,
      }
    });
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    };
    const userMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: workflow.projectId,
        },
      },
    });
    if (!userMember) {
      return res.status(403).json({ message: "User is not a member of this workflow" });
    };
    const userRole = userMember.role;

    if (userRole === "PROJECT_VIEWER" || userRole === "PROJECT_MEMBER") {
      return res.status(403).json({ message: "User does not have permission to reorder columns" });
    }

    const existingColumns = await prisma.column.findMany({
      where: {
        boardId: workflowId as string,
      },
    });

    if (existingColumns.length !== columnIds.length) {
      return res.status(400).json({ message: "Column order does not match the board" });
    }

    const existingIds = new Set(existingColumns.map((column) => column.id));
    const hasInvalidColumn = columnIds.some((columnId) => !existingIds.has(columnId));
    if (hasInvalidColumn) {
      return res.status(400).json({ message: "Invalid column order provided" });
    }

    await prisma.$transaction(
      getColumnOrderUpdates(columnIds).map(({ id, order }) =>
        prisma.column.update({
          where: {
            id,
          },
          data: {
            order,
          },
        })
      )
    );

    return res.status(200).json({ message: "Column order updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteColumn = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId;
    const columnId = req.params.columnId;

    if (!workflowId || !columnId) {
      return res.status(400).json({ message: "Workflow ID and column ID are required" });
    }

    const workflow = await prisma.board.findUnique({
      where: {
        id: workflowId as string,
      },
      include: {
        invalidTransitions: true,
      }
    });
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    };
    const userMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: workflow.projectId,
        },
      },
    });
    if (!userMember) {
      return res.status(403).json({ message: "User is not a member of this workflow" });
    };
    const userRole = userMember.role;

    if (userRole === "PROJECT_VIEWER" || userRole === "PROJECT_MEMBER") {
      return res.status(403).json({ message: "User does not have permission to reorder columns" });
    }

    const column = await prisma.column.findUnique({
      where: {
        id: columnId as string,
      },
    });
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    const Columns = await prisma.column.count({
      where: {
        boardId: workflowId as string,
      },
    });

    if (Columns <= 1) {
      return res.status(400).json({ message: "A board must have at least one column" });
    }

    const taskCount = await prisma.task.count({
      where: {
        statusId: columnId as string,
      },
    });

    if (taskCount > 0) {
      return res.status(400).json({ message: "Move tasks out of this column before deleting it" });
    }

    await prisma.column.delete({
      where: {
        id: columnId as string,
      },
    });

    await prisma.invalidTransition.deleteMany({
      where: {
        boardId: workflowId as string,
        OR: [{ fromColumnId: columnId as string }, { toColumnId: columnId as string }],
      },
    });

    if (workflow.resolvedColumnId === columnId) {
      await prisma.board.update({
        where: {
          id: workflowId as string,
        },
        data: {
          resolvedColumnId: null,
        },
      });
    }

    const columnsAfterDelete = await prisma.column.findMany({
      where: {
        boardId: workflowId as string,
      },
      orderBy: {
        order: "asc",
      },
    });

    await prisma.$transaction(
      columnsAfterDelete.map((currentColumn, index) =>
        prisma.column.update({
          where: {
            id: currentColumn.id,
          },
          data: {
            order: index,
          },
        })
      )
    );

    return res.status(200).json({ message: "Column deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const workflowId = req.params.workflowId;

    if (!workflowId) {
      return res.status(400).json({ message: "Workflow ID is required" });
    }

    const workflow = await prisma.board.findUnique({
      where: {
        id: workflowId as string,
      },
      include: {
        invalidTransitions: true,
      }
    });
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    };
    const userMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: workflow.projectId,
        },
      },
    });
    if (!userMember) {
      return res.status(403).json({ message: "User is not a member of this workflow" });
    };
    const userRole = userMember.role;

    if (userRole === "PROJECT_VIEWER" || userRole === "PROJECT_MEMBER") {
      return res.status(403).json({ message: "User does not have permission to delete workflow" });
    }

    await prisma.task.deleteMany({
      where: {
        boardId: workflowId as string,
      },
    });

    await prisma.invalidTransition.deleteMany({
      where: {
        boardId: workflowId as string,
      },
    });

    await prisma.column.deleteMany({
      where: {
        boardId: workflowId as string,
      },
    });

    await prisma.board.delete({
      where: {
        id: workflowId as string,
      },
    });

    return res.status(200).json({ message: "Workflow deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};