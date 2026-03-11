/**
 * COP290 Assignment 2 - Task Board Types
 * Adheres to strict TypeScript rules (no 'any' types)[cite: 182, 183].
 */

/**
 * Priority levels for tasks
 */
export type PriorityType = "Low" | "Medium" | "High" | "Critical";

/**
 * Hierarchical Task Types
 * Stories are parents; Tasks and Bugs are children
 */
export type TaskType = "Story" | "Task" | "Bug";

/**
 * Project-Level Roles for RBAC[cite: 88].
 */
export type ProjectRole = "GLOBAL_ADMIN" | "PROJECT_ADMIN" | "PROJECT_MEMBER" | "PROJECT_VIEWER";



/**
 * Interface for Issue/Task details[cite: 124, 150].
 */
export interface Task {
  id: string;
  title: string; 
  description?: string; 
  type: TaskType; 
  status: string; 
  priority: PriorityType;
  assignee?: string; // User email or ID [cite: 129]
  reporter: string; // User who created the task [cite: 130]
  dueDate?: string; 
  parentStoryId?: string; // Enforces Story -> Task/Bug relationship 
  createdAt: string; 
  updatedAt: string; 
  resolvedAt?: string; 
  closedAt?: string;
}

/**
 * Interface for Board Columns/Workflows[cite: 103].
 */
export type ColumnData = {
  id: string; // Internal status identifier (e.g., "todo") 
  title: string; // Display name (e.g., "To Do") 
  wipLimit: number; // Mandatory WIP limit enforcement 
  tasks: Task[]; 
}

/**
 * Audit Log structure (Mandatory for Backend storage)[cite: 141].
 */
export interface AuditLog {
  taskId: string; 
  event: "STATUS_CHANGE" | "ASSIGNEE_CHANGE" | "COMMENT_ACTION"; 
  oldValue?: string;
  newValue?: string;
  timestamp: string; 
}