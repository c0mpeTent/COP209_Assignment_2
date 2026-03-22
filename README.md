# SyncFlow

SyncFlow is a Jira-inspired project management application built for COP290 Assignment 2. It supports authentication, project and workflow management, Kanban boards, stories/tasks/bugs, comments, activity history, and persistent in-app notifications.

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router, CSS Modules
- Backend: Express, TypeScript
- Database: MongoDB with Prisma ORM
- Auth: JWT access and refresh tokens stored in HTTP-only cookies

## Repository Structure

```text
assignment_2/
  backend/
  frontend/
  README.md
  report.md
  report.pdf
```

## Features

- Email/password authentication with hashed passwords
- Refresh-token based sessions using HTTP-only cookies
- User profile management with avatar upload
- Project creation, editing, archiving, and member role management
- Multiple Kanban boards per project with configurable columns and WIP limits
- Configurable workflow rules including left-to-right mode, resolved-column selection, and explicit invalid transitions
- Story, task, and bug hierarchy with derived story status
- Drag-and-drop task movement with backend validation
- Task comments with safe markdown-style formatting and mentions
- Activity timeline and audit history
- Persistent notifications with read/unread tracking and history clearing

## Environment Variables

Create a `.env` file inside `/backend`:

```env
PORT=3000
DATABASE_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key
FRONTEND_ORIGIN=http://localhost:5173
BACKEND_ORIGIN=http://localhost:3000
```

Create a `.env` file inside `/frontend`:

```env
VITE_BACKEND_ORIGIN=http://localhost:3000
```

## Installation

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Running the Project

Open two terminals.

### Terminal 1: backend

```bash
cd backend
npm run dev
```

### Terminal 2: frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in the browser.

## Scripts

### Backend

```bash
npm run dev
npm run build
npm run prisma:generate
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
```

## API Summary

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Profile

- `PATCH /api/profile/update`
- `POST /api/profile/update-avatar`
- `DELETE /api/profile/delete-avatar`

### Projects

- `POST /api/project/create`
- `GET /api/project/get`
- `GET /api/project/get-project/:projectId`
- `PATCH /api/project/update/:projectId`
- `PATCH /api/project/archive/:projectId`
- `DELETE /api/project/delete/:projectId`

### Members

- `POST /api/project/add-member`
- `PATCH /api/project/change-member-role`
- `DELETE /api/project/delete-member`

### Workflows and Tasks

- `POST /api/project/add-workflow`
- `GET /api/project/get-workflow/:projectId/:workflowId`
- `PATCH /api/project/update-workflow/:workflowId`
- `DELETE /api/project/delete-workflow/:workflowId`
- `PATCH /api/project/transition-rules/:workflowId`
- `PATCH /api/project/resolved-column/:workflowId`
- `POST /api/project/invalid-transition/:workflowId`
- `DELETE /api/project/invalid-transition/:workflowId/:transitionId`
- `POST /api/project/add-task`
- `GET /api/project/task/:workflowId/:taskId`
- `PATCH /api/project/update-task/:workflowId/:taskId`
- `DELETE /api/project/delete-task/:workflowId/:taskId`

### Columns

- `POST /api/project/add-column/:workflowId`
- `PATCH /api/project/update-column/:workflowId/:columnId`
- `PATCH /api/project/reorder-columns/:workflowId`
- `DELETE /api/project/delete-column/:workflowId/:columnId`

### Comments

- `GET /api/comment/task/:workflowId/:taskId`
- `POST /api/comment/task/:workflowId/:taskId`
- `PATCH /api/comment/:commentId`
- `DELETE /api/comment/:commentId`

### Notifications

- `GET /api/notification`
- `PATCH /api/notification/:notificationId/read`
- `PATCH /api/notification/read-all`
- `DELETE /api/notification/clear-history`

## Testing

Verified locally:

- backend build via `npm run build`
- frontend production build via `npm run build`
- frontend lint via `npm run lint`

The backend also includes TypeScript test files in `backend/src/tests` covering:

- authentication utilities
- project role and permission helpers
- board ordering and Done-column resolution
- task due-date and lifecycle timestamp rules
- workflow transition, WIP, and story-status rules

At the moment, these backend tests are not wired to a working `npm test` script in `backend/package.json`, so the README does not claim a passing automated backend test command.

## Submission Notes

- Source code is written in TypeScript for both frontend and backend.
- Prisma client generation is part of the backend install/build flow.
- Backend test sources are included for the main rule-heavy logic, even though the test runner setup is still incomplete.
- The design report is available in [report.md](./report.md) and [report.pdf](./report.pdf).
