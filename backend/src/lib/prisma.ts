import { PrismaClient } from "../client.js";

// This creates the connection to your MongoDB
const prisma = new PrismaClient();

export default prisma;
