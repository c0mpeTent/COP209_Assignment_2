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
        const user = (req as any).user;
        const workflowId = req.params.workflowId;
        if (typeof workflowId !== 'string') {
            return res.status(400).json({ message: "Invalid workflow ID" });
        }
        const workflow = await prisma.board.findUnique({
            where: {
                id: workflowId
            },
            include: {
                columns: true,
                tasks: {
                    include: {
                        assignee: true,
                    }
                }
            }
        });
        const project = await prisma.project.findUnique({
            where: {
                id: workflow?.projectId
            },
            include: {
                members: true
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const userRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!userRole) {
            return res.status(403).json({ message: "User is not a member of this project" });
        }
        (workflow as any).userRole = userRole;
        return res.status(200).json(workflow);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

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
        if (!assigneeObject) {
            return res.status(404).json({ message: "Assignee not found" });
        }
        console.log("Raw dueDate:", taskDueDate);
        let parsedDate: Date | null = null;
        if (taskDueDate && taskDueDate.trim() !== "") {
            try {
                parsedDate = new Date(taskDueDate);
                console.log("Parsed date:", parsedDate);
                if (isNaN(parsedDate.getTime())) {
                    console.log("Invalid date format");
                    return res.status(400).json({ message: "Invalid due date format" });
                }
            } catch (dateError) {
                console.log("Date parsing error:", dateError);
                return res.status(400).json({ message: "Invalid due date format" });
            }
        } else {
            console.log("Setting dueDate to null");
        }

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
                parentStoryId: parentStoryId,
                assigneeId: assigneeObject.id,
                resolvedAt: null,
                closedAt: null,
                history: [],
            }
        });
        return res.status(201).json(task);
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
        const task = await prisma.task.delete({
            where:{
                id : taskId
            }
        });
        return res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}
export const changeTask = async (req : Request, res : Response) => {
    try {
        const user = (req as any).user ;
        const task = req.body.task;
        const workflowId = req.params.workflowId;
        if (!workflowId || typeof workflowId !== 'string') {
            return res.status(400).json({ message: "Workflow ID is required" });
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
        const updatedTask = prisma.task.update({
            where:{
                id : task.id
            },
            data:{
                ...task
            }
        });
        return res.status(200).json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const addColumn = async (req : Request, res : Response) => {
    try {
        const user = (req as any).user ;
        const title: string = req.body.title;
        const order: number = req.body.order;
        const wipLimit: number = req.body.wipLimit;
        const workflowId = req.params.workflowId;
        if (!workflowId || typeof workflowId !== 'string') {
            return res.status(400).json({ message: "Workflow ID is required" });
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

