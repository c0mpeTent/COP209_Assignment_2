import type { User } from "@prisma/client";
import type { Request } from "express";
import type { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user: User;
}

export interface JwtTokenPayload extends JwtPayload {
  userId: string;
}

export interface AuthenticatedMulterRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}