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

export interface CreateTaskPayload {
  title: string;           
  description: string;     
  type: "Story" | "Task" | "Bug";
  priority: "Low" | "Medium" | "High" | "Critical"; 
  status: string;         
  dueDate?: string | null; 
  parentId?: string | null; 
  createdAt: string;       
}



export interface BoardFetchResponse {
  id: string;
  name: string;
  // Mandatory: Role of the person currently viewing the board
  userRole: "PROJECT_ADMIN" | "PROJECT_MEMBER" | "PROJECT_VIEWER" | "GLOBAL_ADMIN";
  columns: {
    id: string;
    name: string;
    wipLimit: number | null;
    order: number;
  }[];
  tasks: Task[];
}

export interface CreateTaskPayload {
  workflowId: string;     // Added: backend needs this to find the board
  name: string;           // Changed from title -> name
  description: string;
  type: TaskType;
  priority: PriorityType;
  status: string;         // The column title/id
  dueDate?: string | null;
  parentStoryId?: string | null; // Changed from parentId -> parentStoryId
  // Note: Assignee is current ignored by your backend (assigneeId: ""), 
  // but keep it if you plan to update backend later.
  assignee: string; 
}

export interface ColumnProps {
  column: {
    id: string;
    title: string;
    wipLimit: number;
    tasks: Task[];
  };
  boardId: string;
  userRole: string;
  onMoveTask: (taskId: string, sourceColId: string, targetColId: string) => void;
  onRefresh: () => void;
  // Logic Addition: Defined these in the interface
  onCreateTask: (columnId: string, payload: CreateTaskPayload) => Promise<void>;
  onDeleteTask: (taskId: string, columnId: string) => Promise<void>;
}

