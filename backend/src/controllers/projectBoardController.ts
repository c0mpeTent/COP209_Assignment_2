import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const addWorkflow = async (req: Request, res: Response) => {
    try {
        const admin = (req as any).user;
        const name = req.body.workflowname;
        const projectId = req.body.projectId;
        // 1. Verify Project and Permissions 
        const project = await prisma.project.findUnique({
          where: {
              id: projectId as string
          }
        });

        if (!project) return res.status(404).json({ message: "Project not found" });

        // Only Project Owner or Project Admin can add boards 
        // const isAdmin = project.ownerId === admin.id || 
        //                 project.members.find(m => m.userId === admin.id && m.role === "PROJECT_ADMIN");

        // if (!isAdmin) return res.status(403).json({ message: "Forbidden: Insufficient permissions" });

        // 2. Create the Board/Workflow 
        const newBoard = await prisma.board.create({
            data: {
                name: name,
                projectId: projectId
            }
        });
        console.log(newBoard);
        res.status(201).json(newBoard);
    } catch (err) {
        res.status(500).json({ message: "Internal Server Error", err });
    }
};

// export const deleteWorkflow = async (req: Request, res: Response) => {
//     try {
//         const admin = (req as any).user;
//         const { id: projectId, boardId } = req.params;

//         // 1. Verify Permissions 
//         const project = await prisma.project.findUnique({
//             where: { id: projectId },
//             include: { members: true }
//         });

//         if (!project) return res.status(404).json({ message: "Project not found" });

//         const isAdmin = project.ownerId === admin.id || 
//                         project.members.find(m => m.userId === admin.id && m.role === "PROJECT_ADMIN");

//         if (!isAdmin) return res.status(403).json({ message: "Forbidden" });

//         // 2. Delete the Board [cite: 111]
//         // Note: Prisma will handle cascading task deletions if configured in schema
//         await prisma.board.delete({
//             where: { id: boardId }
//         });

//         res.status(200).json({ message: "Workflow deleted successfully" });
//     } catch (err) {
//         res.status(500).json({ message: "Internal Server Error", err });
//     }
// };