import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { GlobalRole } from "../client/index.js";

// defined secret
const secret = process.env.JWT_SECRET || "your_fallback_secret_key";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // search for the "Bearer <token>" in the authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      role: GlobalRole;
    };
    req.user = decoded; // Store user info (id, role) in the request
    next(); // let them pass to the controller
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token." });
  }
};
