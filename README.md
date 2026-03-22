# COP290 Assignment 2 - Project Management System

A full-stack project management application with Kanban board functionality, user authentication, and real-time collaboration features.

## 🏗️ Project Architecture

This is a **MERN stack** application with TypeScript:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: JWT with refresh tokens

## 📋 Features

### Core Functionality
- **User Management**: Registration, login, profile management with avatar uploads
- **Project Management**: Create, manage, and archive projects
- **Kanban Boards**: Visual task management with customizable columns
- **Task Management**: Create, assign, and track tasks with different types (Story, Task, Bug)
- **Comments & Notifications**: Real-time collaboration with commenting system
- **Role-Based Access**: Multiple user roles (Global Admin, Project Admin, Member, Viewer)

### Advanced Features
- **Task Hierarchy**: Parent-child relationships between stories and subtasks
- **Audit Trail**: Complete history tracking for task changes
- **WIP Limits**: Work-in-progress limits for columns
- **Custom Workflows**: Configurable column transitions
- **File Uploads**: Avatar image uploads with size limits

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn


### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/c0mpeTent/COP290_Assignment_2.git
   cd COP290_Assignment_2

2. Install dependencies
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install

3. Run the application
   ```bash
   cd backend
   npm run dev
   cd ../frontend
   npm run dev

4. backend test
   ```bash
   cd backend
   npm test
   ```

## Connection to database using mongodb compass
connection url = mongodb+srv://ta_grader:123456_ta@cluster0.q3nk8vh.mongodb.net/
