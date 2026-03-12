import React, { useState } from "react";
import TaskCard from "./TaskCard";
import ColumnHeader from "./ColumnHeader";
import { useParams } from "react-router-dom";
import styles from "./Kanban.module.css";
import CreateTaskModal from "./CreateTaskModal"; // We will create this next
import type {CreateTaskPayload} from "../../types/kanban";

type TaskType = "Story" | "Task" | "Bug";
type PriorityType = "Low" | "Medium" | "High" | "Critical";

interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: PriorityType;
  status: string; // Corresponds to workflow status 
  assignee?: string;
  reporter: string;
  createdAt: string;
  updatedAt: string;
}
interface ColumnProps {
  column: {
    id: string;
    title: string;
    wipLimit: number; 
    tasks: Task[];
  };
  onMoveTask: (taskId: string, sourceColId: string, targetColId: string) => void;
}

const KanbanColumn: React.FC<ColumnProps> = ({ column, onMoveTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { projectId} = useParams<{ projectId: string}>();
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const sourceColId = e.dataTransfer.getData("sourceColId");

    if (sourceColId !== column.id) {
      onMoveTask(taskId, sourceColId, column.id);
    }
  };

  // 1. API: Create Task 
  const handleCreateTask = async (issuePayload: CreateTaskPayload) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Required for HTTP-only cookies 
        body: JSON.stringify({ ...issuePayload, status: column.id })
      });
      if (response.ok) {
        window.location.reload(); // Simple way to refresh for now
      }
    } catch (err) {
      console.error("Task creation failed", err);
    }
  };

  // 2. API: Update WIP Limit 
  const handleUpdateWip = async () => {
    const newLimit = prompt("Enter new WIP limit:", column.wipLimit.toString());
    if (!newLimit) return;

    try {
      await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/columns/${column.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wipLimit: parseInt(newLimit) })
      });
      window.location.reload();
    } catch (err) {
      console.error("WIP update failed", err);
    }
  };

  // 3. API: Delete Column 
  const handleDeleteColumn = async () => {
    if (!window.confirm("Delete this column? Tasks will be moved to 'To Do'.")) return;

    try {
      await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/columns/${column.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      window.location.reload();
    } catch (err) {
      console.error("Column deletion failed", err);
    }
  };

  return (
    <div 
      className={styles.column}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={styles.headerWrapper}>
        <ColumnHeader 
          title={column.title} 
          currentCount={column.tasks.length} 
          limit={column.wipLimit} 
        />
        {/* Three dots menu for Project Admins  */}
        <div className={styles.menuContainer}>
          <button className={styles.dotsBtn} onClick={() => setShowMenu(!showMenu)}>⋮</button>
          {showMenu && (
            <div className={styles.dropdown}>
              <button onClick={handleUpdateWip}>Change WIP Limit</button>
              <button className={styles.deleteOption} onClick={handleDeleteColumn}>Delete Column</button>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.taskList}>
        {column.tasks.map(task => (
          <TaskCard key={task.id} task={task} columnId={column.id} />
        ))}
      </div>

      {/* Jira-style Create Task Button */}
      <button className={styles.addCardBtn} onClick={() => setIsModalOpen(true)}>
        <span className={styles.plus}>+</span> Create
      </button>

      {isModalOpen && (
        <CreateTaskModal 
          columnId={column.id} 
          onClose={() => setIsModalOpen(false)} 
          onAdd={handleCreateTask}
        />
      )}
    </div>
  );
};


export default KanbanColumn;