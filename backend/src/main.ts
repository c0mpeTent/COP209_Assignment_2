import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true 
}));

app.use(express.json());

// 1. Connect to Database
await prisma.$connect();


// 2. Define Routes

//  auth: register and login
app.use("/api/auth", authRoutes);


// 3. Start Listening
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});