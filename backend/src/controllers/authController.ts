import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // user already exists or not
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create User
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        avatarUrl: `https://ui-avatars.com/api/?name=${name}`,
      },
    });

    // generate Token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.status(201).json({ message: "User registered successfully", user: { id: user.id, name, email } });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log("Login request:", { email, password });
    const user = await prisma.user.findUnique({ where: { email } }); // see if user exist
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password); // compare hashed password to authenticate
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      // generate JWT Token
      { userId: user.id},
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    res
      .status(200)
      .json({ token, user: { id: user.id, name: user.name, email } });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};
