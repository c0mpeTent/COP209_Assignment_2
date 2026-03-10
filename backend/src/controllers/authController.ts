import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js"; // Note the .js extension

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create User
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        avatarUrl: `https://ui-avatars.com/api/?name=${name}`,
        globalRole: "USER",
      },
    });

    // 4. Generate Token
    const token = jwt.sign(
      { userId: user.id, role: user.globalRole },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user: { id: user.id, name, email } });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};
