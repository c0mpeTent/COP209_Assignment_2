export type PriorityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskType = "STORY" | "TASK" | "BUG";

export type ProjectRole =
  | "GLOBAL_ADMIN"
  | "PROJECT_ADMIN"
  | "PROJECT_MEMBER"
  | "PROJECT_VIEWER";

export interface Comment {
  id: string;
  text: string;
  taskId: string;
  authorId: string;
  authorName: string;
  author?: Reporter;
  createdAt: string;
  updatedAt: string;
}

export interface MentionedUser {
  id: string;
  name: string;
  email: string;
}

export interface TaskHistoryEntry {
  event:
    | "STATUS_CHANGE"
    | "ASSIGNEE_CHANGE"
    | "COMMENT_ADDED"
    | "COMMENT_EDITED"
    | "COMMENT_DELETED";
  createdAt: string;
  actorId: string;
  actorName: string;
  message: string;
  oldValue?: string | null;
  newValue?: string | null;
  commentId?: string;
  mentions?: MentionedUser[];
}

export interface Assignee {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Reporter {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardMemberOption {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: string;
  priority: PriorityType;
  assignee?: Assignee | null;
  reporterId?: string;
  reporter?: Reporter;
  dueDate?: string | null;
  parentStoryId?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  comments?: Comment[];
  history?: TaskHistoryEntry[];
}

export interface ColumnData {
  id: string;
  title: string;
  order: number;
  wipLimit: number;
  tasks: Task[];
}

export interface BoardFetchResponse {
  id: string;
  name: string;
  userRole: ProjectRole;
  columns: {
    id: string;
    name: string;
    wipLimit: number | null;
    order: number;
  }[];
  members: BoardMemberOption[];
  tasks: Task[];
}

export interface TaskDetailsResponse {
  id: string;
  workflowName: string;
  projectId: string;
  userRole: ProjectRole;
  currentUserId: string;
  columns: {
    id: string;
    name: string;
    wipLimit: number | null;
    order: number;
  }[];
  members: BoardMemberOption[];
  task: Task;
}

export interface CreateTaskPayload {
  workflowId: string;
  title: string;
  description: string;
  type: TaskType;
  priority: PriorityType;
  status: string;
  dueDate?: string | null;
  parentStoryId?: string | null;
  assignee?: string;
}

export interface UpdateTaskPayload {
  taskId: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: PriorityType;
  assignee?: string;
  dueDate?: string | null;
}

export interface ColumnUpdatePayload {
  title?: string;
  wipLimit?: number;
}

export interface ColumnProps {
  column: ColumnData;
  boardId: string;
  userRole: ProjectRole;
  allColumns: ColumnData[];
  members: BoardMemberOption[];
  activeStoryId?: string | null;
  onMoveTask: (taskId: string, sourceColId: string, targetColId: string) => Promise<void>;
  onUpdateTask: (payload: UpdateTaskPayload) => Promise<void>;
  onCreateTask: (columnId: string, payload: CreateTaskPayload) => Promise<void>;
  onDeleteTask: (taskId: string, columnId: string) => Promise<void>;
  onRenameColumn: (columnId: string, title: string) => Promise<void>;
  onUpdateColumn: (columnId: string, payload: ColumnUpdatePayload) => Promise<void>;
  onReorderColumn: (columnId: string, direction: "left" | "right") => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
}

export interface Board {
  id: string;
  name: string;
  projectId: string;
}
