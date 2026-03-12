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

export const addProjectMember = async ( req : Request, res : Response) => {
    try {
        const admin = (req as any ) .user;
        const memberEmail = req.body.memberEmail;
        const projectId = req.body.projectId;
        const member = await prisma.user.findUnique({
            where: {
                email: memberEmail
            }
        })
        if (!member){
            return res.status(404).json({ message: "User not found" });
        }
        const project = await prisma.project.findUnique({
            where: {
                id: projectId
            },
            include: {
                members: true
            }
        })
        if (!project){
            return res.status(404).json({ message: "Project not found" });
        }
        if ( project.ownerId != admin.id ){
            return res.status(403).json({ message: "Forbidden" });
        }
        if ( project.members.some((m) => m.id === member.id) ){
            return res.status(400).json({ message: "Member already exists" });
        }
        const projectMember = await prisma.projectMember.create({
            data: {
                projectId: projectId,
                userId: member.id,
                role: "PROJECT_MEMBER"
            }
        });
        res.status(200).json({ message: "Member added successfully", projectMember, user: member });

    } catch (err){
        res.status(500).json({ message: "Internal Server Error", err });
    }
}

export const changeProjectMemberRole = async (req : Request  , res : Response)=>{
    try {
        const admin = (req as any ) .user;
        const memberEmail = req.body.memberEmail;
        const projectId = req.body.projectId;
        const role = req.body.role;
        const member = await prisma.user.findUnique(
            {
                where: {
                    email: memberEmail
                }
            }
        )
        const project = await prisma.project.findUnique({
            where: {
                id: projectId
            },
        });
        if (!project){
            return res.status(404).json({ message: "Project not found" });
        }
        if ( project.ownerId != admin.id ){
            return res.status(403).json({ message: "Forbidden" });
        }
        if (!member){
            return res.status(404).json({ message: "Member not found" });
        }
        const projectMember = await prisma.projectMember.update({
            where: {
                userId_projectId: {
                    userId: member.id,
                    projectId: projectId
                }
            },
            data: {
                role: role
            }
        });
        res.status(200).json({ message: "Member role changed successfully",user: member, projectMember });
        
    } catch (err) {
        res.status(500).json({ message: "Internal Server Error", err });
    }
}
export const deleteProjectMember = async (req : Request , res : Response) => {
    try {
        const admin = (req as any ) .user;
        const memberEmail = req.body.memberEmail;
        const projectId = req.body.projectId;
        const member = await prisma.user.findUnique(
            {
                where: {
                    email: memberEmail
                }
            }
        )
        const project = await prisma.project.findUnique({
            where: {
                id: projectId
            },
        });
        if (!project){
            return res.status(404).json({ message: "Project not found" });
        }
        if ( project.ownerId != admin.id ){
            return res.status(403).json({ message: "Forbidden" });
        }
        if (!member){
            return res.status(404).json({ message: "Member not found" });
        }
        const projectMember = await prisma.projectMember.delete({
            where: {
                userId_projectId: {
                    userId: member.id,
                    projectId: projectId
                }
            }
        });
        res.status(200).json({ message: "Member removed successfully", user: member, projectMember });
        
    } catch (err) {
        res.status(500).json({ message: "Internal Server Error", err });
    }
}

