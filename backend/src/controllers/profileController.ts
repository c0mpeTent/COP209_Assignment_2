import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import fs from "fs";


export const updateAvatar = async ( req : Request , res : Response) => {
  try {
    if (!req.file){
        return res.status(400).json({ error: "No file uploaded" });
    }
    const user = (req as any).user;
    const id = user.id;

    if (user.avatarUrl != "") {
        const filename = user.avatarUrl.split('/').pop();
        if ( filename){
            const localPath = `./uploads/${filename}`;
            if (fs.existsSync(localPath)){
                fs.unlinkSync(localPath);
            }
        }
    }

    const fullAvatarUrl = `${process.env.BACKEND_ORIGIN}/uploads/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
        where: { id},
        data: { avatarUrl: fullAvatarUrl}
    });
    res.status(200).json({ message: "Avatar updated successfully", user: updatedUser });
    
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ error: "Failed to update avatar" });
  }
}

export const deleteAvatar = async ( req : Request , res : Response) => {
    try {
    const user = (req as any).user;
    const id = user.id;
    if (user.avatarUrl != "") {
        const filename = user.avatarUrl.split('/').pop();
        if ( filename){
            const localPath = `./uploads/${filename}`;
            if (fs.existsSync(localPath)){
                fs.unlinkSync(localPath);
            }
        }
    }
    const updatedUser = await prisma.user.update({
        where: { id},
        data: { avatarUrl: ""}
    });
    res.status(200).json({ message: "Avatar updated successfully", user: updatedUser });
    
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ error: "Failed to update avatar" });
  }
}