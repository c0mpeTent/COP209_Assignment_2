import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import multer from "multer";
import path from "path";

dotenv.config();


import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import {addAuthenticateUser} from './controllers/authController.js';


const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN, 
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
  credentials: true 
}));
app.use(cookieParser());


//multer configuration
const storage = multer.diskStorage({
  destination: (req , file , cb) => {
    cb(null, "uploads/");
  },
  filename: (req , file , cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
})



const upload = multer(
  {
    storage : storage,
    limits: {
      fileSize: 1024 * 1024 * 5, // 5MB
    }
  }
);



// profile: update profile
app.use("/api/profile", addAuthenticateUser, upload.single("avatar"), profileRoutes);

app.use(express.json({ limit: '10mb' })); // Increase from default 100kb
app.use(express.urlencoded({ limit: '10mb', extended: true }));


// 1. Connect to Database
const connectToDataBase = async () => {
  try{
    await prisma.$connect();
    console.log("db connected");
  }catch (error){
    console.error("Error connecting to database:", error);
    process.exit(1);
  }
}
connectToDataBase();



// 2. Define Routes


// serve static images
app.use("/uploads", express.static("uploads"));

//  auth: register and login
app.use("/api/auth", authRoutes);

// project: create, get, update, delete projects
app.use("/api/project", addAuthenticateUser, projectRoutes);



// 3. Start Listening
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
