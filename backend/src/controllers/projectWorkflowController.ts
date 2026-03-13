import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const createWorkflow = async (req: Request, res: Response) => {
    try {
        // console.log(req.body);
        const user = (req as any).user;
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
        return res.status(201).json(workflow);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const createTask = async (req: Request, res: Response) => {
    try {
       
        const user = (req as any).user;
        const workflowId = req.body.workflowId;
        const taskName = req.body.name;
        const taskType = req.body.type;
        const taskDescription = req.body.description;
        const taskPriority = req.body.priority;
        const taskDueDate = req.body.dueDate;
        const taskStatus = req.body.status;
        const parentStoryId = req.body.parentStoryId ? req.body.parentStoryId : "";
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
        const task = await prisma.task.create({
            data: {
                title: taskName,
                description: taskDescription,
                type: taskType,
                status: taskStatus,
                priority: taskPriority,
                dueDate: taskDueDate,
                boardId: workflowId,
                reporterId: user.id,
                parentStoryId: parentStoryId,
                assigneeId: "",
                resolvedAt: null,
                closedAt: null,
                history: [],
            }
        });
        return res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}