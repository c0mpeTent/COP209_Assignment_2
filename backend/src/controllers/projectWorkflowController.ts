import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { type Comment ,type Column , type Prisma , type ProjectRole , type Task as PrismaTask , type User, TaskType } from "@prisma/client";

import { deriveStoryStatusId, getColumnOrderUpdates , getLifecycleDatesForStatus, parseDueDate } from "../lib/workflowUtils.js";
import type { AuthenticatedRequest } from "../types/auth.js";
import { serialize } from "node:v8";
import { type } from "node:os";

type TaskWithRelation = PrismaTask& {assignee: User | null ; reporter: User | null}

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
    currentClosedAt
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

  if (currentColumn.order >= nextColumn.order) {
    throw new Error("Invalid status transition. Tasks can only move left to right.");
  }
};

const syncStoryStatus = async (storyId: string) => {
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

  const lifecycleDates = await getLifecycleDates(
    story.boardId,
    nextStatusId,
    story.resolvedAt,
    story.closedAt
  );

  return prisma.task.update({
    where: {
      id: storyId,
    },
    data: {
      statusId: nextStatusId,
      resolvedAt: lifecycleDates.resolvedAt,
      closedAt: lifecycleDates.closedAt,
    },
  });
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
                projectId: projectId
            }
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
            columns: workflow.columns,
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
                }
            }
        );
        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }
        const task = await prisma.task.findUnique(
            {
                where: {
                    id : taskId as string
                }
            }
        );
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
        res.status(200).json(
            {
                id : task.id,
                task : serialize(task),
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
        const assigneeObject = await prisma.user.findUnique(
            {
                where:{
                    email: assignEmail
                }
            }
        );
        const assigneeId = assigneeObject?.id ?? null;
        const parsedDate = parseDueDate(taskDueDate);
        
        if (taskType == "STORY" && parentStoryId){
            return res.status(400).json({ message: "Stories cannot be children of other tasks" });
        };
        if (taskType != "STORY" && parentStoryId){
            const parentStory = await prisma.task.findUnique({
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
        if (taskType !== "STORY" && parentStoryId) {
            await syncStoryStatus(parentStoryId);
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
        const task = await prisma.task.findUnique({
            where:{
                id : taskId
            }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        if (task.type === "STORY"){
            await prisma.task.deleteMany({
                where:{
                    parentStoryId: task.id
                }
            })
        };

        await prisma.task.delete({
            where:{
                id: taskId
            }
        });
        if (task.parentStoryId) {
            await syncStoryStatus(task.parentStoryId);
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
            } = req.body
        const exitingTask = await prisma.task.findUnique({
            where:{
                id : taskId as string
            }
            
        });
        if (!exitingTask) {
            return res.status(404).json({ message: "Task not found" });
        };

        const updateData: Prisma.TaskUncheckedUpdateInput = {};
        updateData.title = title;
        updateData.description = description;
        updateData.priority = priority;
        updateData.dueDate = dueDate;

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
        };
        updateData.dueDate = dueDate||null;

        if ( assignee !== undefined){
            const assigneeObject = await prisma.user.findUnique({
                where: {
                    email : assignee
                }
            })
            updateData.assigneeId = assigneeObject?.id ?? null;
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

        if (updatedTask.parentStoryId){
            await syncStoryStatus(updatedTask.parentStoryId);
        }
        return res.status(200).json(serializeTask(updatedTask));
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
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

