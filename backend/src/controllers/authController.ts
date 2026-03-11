import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    console.log(email, password, name);

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
      secure: true,
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

    res.cookie('token',token,{
      httpOnly: true, 
      secure:true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.status(200).json({ message: "Login successful", user: { id: user.id, name: user.name, email } });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};
export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie('token',{
      httpOnly: true, 
      secure: true,
      maxAge: 0, // 0 means delete the cookie
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error });
  }
};
export const validateToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    const id = (decoded as any).userId;
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    res.status(200).json({ message: "Token is valid", user : { id: user.id, name: user.name, email: user.email , avatarUrl: user.avatarUrl } });
  } catch (error) {
    res.status(500).json({ message: "Token validation failed", error });
  }
};

export const addAuthenticateUser = async (req :Request, res :Response,next :Function) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    const id = (decoded as any).userId;
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "User authentication failed", error });
  }
};

