import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { ProjectRole } from "@prisma/client";
import type { AuthenticatedRequest } from "../types/auth.js";

export const createProject = async (req: Request, res: Response) => {
  try {
    const {  name , description } = req.body;
    const user = (req as AuthenticatedRequest).user;
    // console.log(name, description);
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
            role: "GLOBAL_ADMIN"
        }
    })

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};
export const getProject = async (req : Request , res : Response) => {
    try {
        const projectId = req.params.projectId;
        const user = (req as AuthenticatedRequest).user;
        const project = await prisma.project.findUnique({
            where: {
                id: projectId as string
            },
            include: {
                members:{
                    include:{
                        user:true
                    }
                },
                boards: true
            }
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        let viewerRole = project.members.find((member) => member.userId === user.id)?.role;
        if (!viewerRole) {
            return res.status(403).json({ message: "You are not a member of this project" });
        }
        res.status(200).json({ message: "Project fetched successfully", project , viewerRole });
    }catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }
}
export const getProjects = async ( req : Request  , res : Response) => {
    const user = (req as AuthenticatedRequest).user ;
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
        const user = (req as AuthenticatedRequest).user;
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
// export const setProjectDescription = async ( req : Request , res : Response) => {
//     try {
//         const projectId = req.body.projectId;
//         const description = req.body.description;
//         const user = (req as AuthenticatedRequest).user;

//         const projectMember = await prisma.projectMember.findUnique({
//             where: {
//                 userId_projectId:{
//                     userId: user.id,
//                     projectId: projectId
//                 }
//             }
//         })
//         if (!projectMember) {
//             return res.status(403).json({ message: "Forbidden" });
//         }
//         if (projectMember.role == "PROJECT_MEMBER" || projectMember.role == "PROJECT_VIEWER") {
//             return res.status(403).json({ message: "Forbidden" });
//         }
//         const project = await prisma.project.update({
//             where: {
//                 id : projectId
//             },
//             data: {
//                 description: description
//             }
//         })
//         res.status(200).json({ message: "Project description updated successfully" , project });
        
//     }catch (error) {
//         res.status(500).json({ message: "Internal Server Error", error });
//     }
// }
export const updateProject = async (req : Request  , res : Response) => {
    try {
        const projectId = req.params.projectId;
        const name = req.body.name;
        const description = req.body.description;
        const user = (req as AuthenticatedRequest).user;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }
        const userRole = await prisma.projectMember.findUnique(
            {
                where: {
                    userId_projectId: {
                        userId: user.id,
                        projectId: projectId as string ,
                    }
                }
            }
        );

        if (!userRole) return res.status(403).json({ message: "Forbidden" });
        if (userRole.role === "PROJECT_MEMBER" || userRole.role === "PROJECT_VIEWER") {
            return res.status(403).json({ message: "Forbidden" });
        };
        const project = await prisma.project.update({
            where:{
                id : projectId as string
            },
            data : {
                name : name ,
                description : description
            }
        });
        res.status(200).json({ message: "Project updated successfully" , project });
        
    }catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }
};

export const changeProjectArchive = async (req : Request , res : Response) => {
    try {
        const projectId = req.params.projectId;
        const isArchived = req.body.isArchived;
        const user = (req as AuthenticatedRequest).user;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }
        const userRole = await prisma.projectMember.findUnique(
            {
                where: {
                    userId_projectId: {
                        userId: user.id,
                        projectId: projectId as string ,
                    }
                }
            }
        );

        if (!userRole) return res.status(403).json({ message: "Forbidden" });
        if (userRole.role === "PROJECT_MEMBER" || userRole.role === "PROJECT_VIEWER") {
            return res.status(403).json({ message: "Forbidden" });
        };
        const project = await prisma.project.update(
            {
                where: {
                    id : projectId as string 
                },
                data: {
                    isArchived : isArchived
                }
            }
        );
        res.status(200).json({ message: "Project archived status changed" , project });
        
    }catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }
}