# SyncFlow Report

## Team

- Entry number 1: `__________`
- Entry number 2: `__________`
- GitHub repository: [https://github.com/c0mpeTent/COP290_Assignment_2.git](https://github.com/c0mpeTent/COP290_Assignment_2.git)

## Project Overview

SyncFlow is a Jira-inspired task management platform developed for COP290 Assignment 2. It supports authentication, project and workflow management, Kanban boards, stories/tasks/bugs, comments, activity history, and persistent in-app notifications.

The implementation follows the assignment structure closely:

- authentication and authorization with persistent sessions
- project creation and team management
- Kanban workflows with configurable columns and rules
- stories, tasks, and bugs with parent-child linking
- drag-and-drop movement with server-side validation
- comments, mentions, and activity history
- in-app notifications

## Functional Requirements Mapping

### 1. Authentication, Authorization, and User Management

The application supports sign up, login, logout, session validation, profile editing, and avatar upload. Authentication is implemented with JWT access tokens and refresh tokens stored in HTTP-only cookies. Authorization is enforced through project membership roles:

- `GLOBAL_ADMIN`
- `PROJECT_ADMIN`
- `PROJECT_MEMBER`
- `PROJECT_VIEWER`

Sensitive actions such as workflow updates, member-role changes, and archive/delete actions are guarded on the backend rather than only in the UI.

### 2. Projects

Users can create projects, edit project metadata, archive projects, and manage project members. The project details page also acts as the project administration screen, where admins can:

- inspect members and their roles
- invite members
- change member permissions
- create or delete workflows within the project

### 3. Boards (Kanban)

Each project can contain multiple workflows. Every workflow stores:

- ordered columns
- optional WIP limits per column
- optional left-to-right-only movement rules
- a configurable resolved column
- explicit invalid transitions between status pairs

These rules are enforced on the backend so drag-and-drop actions cannot bypass workflow restrictions.

### 4. Items and Hierarchy

The board supports three item types:

- stories
- tasks
- bugs

Stories are kept visually separate from regular Kanban cards. Tasks and bugs can optionally be attached to a parent story, and the story status is derived automatically from the leftmost child-item status. This keeps the hierarchy visible without mixing stories into normal task lanes.

### 5. Drag and Drop

Task movement is interactive on the frontend but validated on the backend. The final workflow behavior includes:

- optimistic board updates for responsiveness
- rollback on failed moves
- WIP-limit enforcement
- invalid-transition checks
- left-to-right rule enforcement
- automatic lifecycle timestamp updates when statuses change

This approach preserves usability while keeping the server as the source of truth.

### 6. Comments and Collaboration

Each task has a dedicated details page that includes:

- editable metadata
- comment thread
- lightweight markdown-style formatting
- mentions using `@username`
- activity history
- story assignment controls

Comments are persisted in the database, can be edited/deleted by their author, and generate activity entries for later audit.

### 7. Notifications

The system includes persistent in-app notifications backed by the database. Notifications are created for major collaboration events such as:

- assignment changes
- status changes
- comments
- mentions
- item creation
- deletion
- story-link updates

The frontend polls periodically instead of relying on WebSockets, which keeps the implementation simpler while still satisfying the assignment requirement for in-app notifications.

## Design Decisions

### 1. Frontend and Backend Separation

The project is split into two TypeScript codebases:

- a React + Vite frontend for the UI
- an Express + Prisma backend for API handling and business rules

This separation keeps workflow rules, session handling, and database logic on the backend while the frontend focuses on rendering and interaction.

### 2. Authentication and Session Renewal

Authentication uses cookie-based JWT sessions with:

- short-lived access tokens
- long-lived refresh tokens
- refresh-token invalidation on logout

This was chosen because the assignment requires login persistence plus session renewal. Storing refresh tokens in the database also makes logout invalidation real instead of being only browser-side.

### 3. Database and Schema Choice

MongoDB with Prisma was used because:

- Prisma keeps models typed and consistent across the backend
- MongoDB works well for nested workflow/task/comment data
- the starting project base already fit this direction

The schema models:

- users and project memberships
- boards and workflow columns
- stories, tasks, and bugs
- comments and notifications
- audit history and lifecycle timestamps

### 4. Workflow Rules

Workflow rules are enforced on the backend so invalid frontend actions cannot bypass them. The implementation supports:

- board-level WIP limits
- configurable transition rules
- optional left-to-right-only mode
- custom invalid status transitions

This design is better than frontend-only checks because the backend stays the source of truth for every move.

### 5. Resolved and Closed Timestamp Logic

Lifecycle timestamps were kept automatic instead of editable per task. This was a deliberate decision because manual editing would make audit data less trustworthy.

Current behavior:

- `resolvedAt` is set when an item reaches the configured resolved column for that workflow
- default resolved column is `Done`
- if `Done` does not exist, the last column is used
- if admins configure a different resolved column, that configured column takes priority
- `closedAt` is set only when an item reaches the final column

This gives flexibility without turning lifecycle timestamps into user-entered values.

### 6. Story Hierarchy

Stories are kept separate from the main Kanban card flow.

The chosen structure is:

- a story list strip above the board
- all tasks and bugs remain in the main Kanban columns, whether they belong to a story or not
- clicking a story opens its task-details page
- story details page shows child tasks/bugs in a separate grid

This design follows the updated requirement that stories should not occupy normal Kanban card space.

### 7. Task Details and Collaboration

Task collaboration uses a dedicated task-details page instead of an overlay. This was chosen because comments, activity history, metadata, and story linkage become too crowded inside a modal.

The task page supports:

- metadata and edit actions
- comments with minimal markdown-style formatting
- mentions using `@username`
- activity timeline
- story assignment and reassignment for tasks and bugs

### 8. Notifications

Notifications are persistent and stored in the database. Polling was used instead of WebSockets because the assignment explicitly allows it and it keeps the implementation simpler and more reliable.

Implemented notification triggers include:

- task assignment
- task status change
- comment added
- user mentioned in comment
- task/story/bug creation
- task assigned to story
- task/story deletion

Notifications are shown in one notification-center page with unread and history sections.

### 9. UX Decisions

The UI follows a consistent dark-theme visual language across dashboard, project details, workflow board, task details, and notifications.

Some small but important UX decisions were:

- inline loading states for actions such as saving, deleting, and creating
- disabled controls during pending actions
- partially optimistic drag-and-drop for task movement
- inline board feedback for move success/failure
- sidebar notification badge

For drag-and-drop specifically, a controlled optimistic approach was used:

- the task moves immediately in the UI
- the backend still validates the move
- the board is temporarily locked during the request
- on failure, the task rolls back and an inline error is shown

This gives a faster board experience without allowing conflicting parallel move actions.

## Challenges and Tradeoffs

### Keeping Backend as Source of Truth

The project has many rule-heavy behaviors:

- transition validation
- WIP enforcement
- story status derivation
- audit logging
- notifications

Because of that, the backend had to remain authoritative even when the frontend was made more responsive.

### Minimal Rich Text Instead of Full Editor

A markdown-style comment system was chosen over a full rich-text editor. This keeps the implementation small enough for the assignment while still satisfying the formatted-comment requirement in a defendable way.

### Story Representation

An earlier story-focused board view was replaced with the current story-strip design. The final approach is simpler, closer to the updated requirement, and avoids mixing parent stories with regular work-item cards.

## Code Quality and Testing

The codebase uses TypeScript on both frontend and backend, and the backend keeps rule-heavy workflow logic centralized rather than spreading it across UI components.

The repository currently includes focused backend test sources for:

- auth utilities
- project role and permission helpers
- board ordering and resolved-column selection
- task due-date and lifecycle timestamp rules
- workflow transition and WIP logic
- story-status derivation

During this documentation update, the following checks were verified:

- backend build passes
- frontend build passes
- frontend lint passes

One important limitation is that the backend test files are present but not yet wired to a working `npm test` command in `backend/package.json`. So it would be inaccurate to claim that the backend tests currently pass through the packaged script interface. The tests reflect intended coverage, but the runner setup still needs finishing.

## Known Limitations

- Backend automated tests are not yet exposed through a working package script.
- Notifications use polling rather than real-time push updates.
- Some UI flows still rely on native browser alerts/confirms instead of custom dialogs.

## Future Improvements

- replace browser alerts/confirms with themed dialogs
- finish the backend test runner setup and add more controller or route-level tests
- add richer comment formatting if the project scope increases
- refine optimistic updates for more actions beyond drag-and-drop

## Conclusion

SyncFlow fulfills the assignment goals by combining typed full-stack development, workflow-rule enforcement, story hierarchy, collaboration tools, and persistent notifications in a single Jira-inspired system. The report now reflects the implementation more accurately, especially around workflow rules, notification behavior, and the current testing state.
