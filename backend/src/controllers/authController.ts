import type { CookieOptions, NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash , randomBytes} from "crypto";
import prisma from "../lib/prisma.js";
import type { User } from "@prisma/client";


type PublicUser = Pick<User, "id" | "name" | "email" | "avatarUrl">;
const sanitizeUser = (user: PublicUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
});

const hashRefreshToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const getCookieOptions = (
  maxAge: number,
  nodeEnv = process.env.NODE_ENV
): CookieOptions => ({
  httpOnly: true,
  secure: nodeEnv === "production",
  sameSite: "lax",
  maxAge,
});

import type { AuthenticatedRequest, JwtTokenPayload } from "../types/auth.js";


//some usefull functions
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(
    'token',
    accessToken,
    getCookieOptions(15*60*1000)
  );
  res.cookie(
    'refreshToken',
    refreshToken,
    getCookieOptions(7*24*60*60*1000)
  );
};

const persistRefreshToken = async (userId: string, refreshToken: string) => {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { userId },
        { expiresAt: { lt: new Date() } },
      ],
    },
  });

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7*24*60*60*1000),
    },
  });
};

const issueAuthSession = async (res: Response, userId: string) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "15m" });;
  const refreshToken = randomBytes(48).toString("hex");

  await persistRefreshToken(userId, refreshToken);
  setAuthCookies(res, accessToken, refreshToken);
};

const getUserFromAccessToken = async (token: string) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtTokenPayload;

  if (!decoded.userId) {
    throw new Error("Invalid token payload");
  }

  return prisma.user.findUnique({
    where: { id: decoded.userId },
  });
};

const rotateRefreshSession = async (req: Request, res: Response) => {
  const refreshToken = req.cookies['refreshToken'] as string | undefined;

  if (!refreshToken) {
    return null;
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash: hashRefreshToken(refreshToken),
    },
  });

  if (!storedToken || storedToken.expiresAt <= new Date()) {
    if (storedToken) {
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
    }
    res.clearCookie('token', getCookieOptions(0));
    res.clearCookie('refreshToken', getCookieOptions(0));
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: storedToken.userId },
  });

  if (!user) {
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    res.clearCookie('token', getCookieOptions(0));
    res.clearCookie('refreshToken', getCookieOptions(0));
    return null;
  }

  const nextAccessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "15m" });

  // Keep the same refresh token during refresh so concurrent requests
  // do not invalidate each other's session recovery path.
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: {
      expiresAt: new Date(Date.now() + 7*24*60*60*1000),
    },
  });

  setAuthCookies(res, nextAccessToken, refreshToken);
  return user;
};

const getAuthenticatedUser = async (req: Request, res: Response) => {
  const token = req.cookies['token'] as string | undefined;

  if (token) {
    try {
      const user = await getUserFromAccessToken(token);
      if (user) {
        return user;
      }
    } catch (error) {
      if (!(error instanceof jwt.TokenExpiredError)) {
        res.clearCookie('token', getCookieOptions(0));
        res.clearCookie('refreshToken', getCookieOptions(0));
      }
    }
  }

  return rotateRefreshSession(req, res);
};



export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    console.log(email, password, name);

    if (!email || !password || !name) {
      return res.status(400).json({ message: "All fields are required" });
    }

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
    await issueAuthSession(res, user.id);

    res.status(201).json({ message: "User registered successfully", user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await prisma.user.findUnique({ where: { email } }); // see if user exist
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password); // compare hashed password to authenticate
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    await issueAuthSession(res,user.id);
    res.status(200).json({ message: "Login successful", user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};
export const logout = async (req: Request, res: Response) => {
  try {
     const refreshToken = req.cookies['refreshToken'] as string | undefined;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: {
          tokenHash: hashRefreshToken(refreshToken),
        },
      });
    }
    res.clearCookie('token', getCookieOptions(0));
    res.clearCookie('refreshToken', getCookieOptions(0));
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error });
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  try {
    const user = await rotateRefreshSession(req, res);

    if (!user) {
      return res.status(401).json({ message: "Refresh token is invalid or expired" });
    }

    return res.status(200).json({
      message: "Session refreshed successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Session refresh failed", error });
  }
};


export const validateToken = async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req,res);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    res.status(200).json({ message: "Token is valid", user : sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Token validation failed", error });
  }
};

export const addAuthenticateUser = async (req :Request, res :Response,next :Function) => {
  try {
    const user = await getAuthenticatedUser(req,res);

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "User authentication failed", error });
  }
};
