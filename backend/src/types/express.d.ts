import { GlobalRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: GlobalRole;
      };
    }
  }
}
