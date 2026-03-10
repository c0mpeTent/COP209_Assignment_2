import { PrismaClient } from "@prisma/client";

// This creates the connection to your MongoDB
const prisma = new PrismaClient();

export default prisma;
