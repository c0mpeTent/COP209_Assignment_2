import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // creates the Project AND the ProjectMember entry at once
    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: "PROJECT_ADMIN",
          },
        },
      },
      include: {
        members: true, // This sends back the membership info in the response
      },
    });

    res.status(201).json({
      message: "Project created successfully!",
      project,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create project", error });
  }
};
