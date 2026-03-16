import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import fs from "fs";
import bcrypt from "bcryptjs";

import type { AuthenticatedMulterRequest } from "../types/auth.js";


export const updateAvatar = async ( req : Request , res : Response) => {
  try {
    // console.log(req);
    if (!req.file){
        return res.status(400).json({ error: "No file uploaded" });
    }
    const user = (req as AuthenticatedMulterRequest).user;
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
    const user = (req as AuthenticatedMulterRequest).user;
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
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedMulterRequest).user;
    const id = user.id;
    const { name, email, password } = req.body 

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser && existingUser.id !== id) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name,
        email: email,
        password: password ? await bcrypt.hash(password, 10) : user.password,
      },
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};