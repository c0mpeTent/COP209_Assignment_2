import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const createProject = async (req: Request, res: Response) => {
  try {
    const {  name , description } = req.body;
    const user = (req as any).user;
    console.log(name, description);
    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: user.id,
      },
    });

    const projectMember = await prisma.projectMember.create({
        data:{
            projectId: project.id,
            userId: user.id,
            role: "PROJECT_ADMIN"
        }
    })

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

export const getProjects = async ( req : Request  , res : Response) => {
    const user = (req as any ).user ;
    try {
        const projects = await prisma.project.findMany({
            where: {
                members: {
                    some: {
                        userId: user.id
                    }
                }
            }
        })
        res.status(200).json({ message: "Projects fetched successfully", projects });
    }catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }

}
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId;
        // console.log("point 1");
        const user = (req as any).user;
        const project = await prisma.project.findUnique({
            where: {
                id: projectId as string
            }
        });
        // console.log("point 2");
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        if (project.ownerId !== user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }
        await prisma.projectMember.deleteMany({
            where: {
                projectId: projectId as string
            }
        });
        // console.log("point 4");
        await prisma.board.deleteMany({
            where:{
                projectId: projectId as string
            }
        })
        // console.log("point 3");
        // console.log(project);
        await prisma.project.delete({
            where: {
                id: projectId as string
            }
        });
        
        res.status(200).json({ message: "Project deleted successfully" });
    }catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }
}