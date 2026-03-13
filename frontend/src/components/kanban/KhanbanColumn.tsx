import React, { useState } from "react";
import TaskCard from "./TaskCard";
import ColumnHeader from "./ColumnHeader";
import { useParams } from "react-router-dom";
import styles from "./Kanban.module.css";
import CreateTaskModal from "./CreateTaskModal";
import type { CreateTaskPayload, ColumnProps } from "../../types/kanban";


const KanbanColumn: React.FC<ColumnProps> = ({ 
  column, 
  userRole, 
  onMoveTask, 
  onRefresh, 
  onCreateTask, // Destructured
  onDeleteTask  // Destructured
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { projectId } = useParams<{ projectId: string }>();

  const isAdmin = userRole === "PROJECT_ADMIN" || userRole === "GLOBAL_ADMIN";
  const canCreate = userRole !== "PROJECT_VIEWER";

  // Refined Create Logic: Uses the prop instead of local fetch
  const handleCreateTaskInternal = async (issuePayload: CreateTaskPayload) => {
    // 1. Validate WIP limit before calling the parent logic
    if (column.wipLimit > 0 && column.tasks.length >= column.wipLimit) {
      alert("Cannot create task: Column WIP limit reached.");
      return;
    }
  
    try {
      // 2. FIX: Pass BOTH arguments to the parent handler
      // onCreateTask(columnId: string, payload: CreateTaskPayload)
      await onCreateTask(column.id, issuePayload); 
      
      setIsModalOpen(false);
    } catch (err) {
      console.error("Task creation failed", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const sourceColId = e.dataTransfer.getData("sourceColId");

    // Block if WIP limit is reached (Frontend safeguard)
    if (column.wipLimit > 0 && column.tasks.length >= column.wipLimit && sourceColId !== column.id) {
      alert(`WIP Limit reached for ${column.title}.`);
      return;
    }

    if (sourceColId !== column.id) {
      onMoveTask(taskId, sourceColId, column.id);
    }
  };


  const handleUpdateWip = async () => {
    const newLimit = prompt("Enter new WIP limit:", column.wipLimit.toString());
    if (newLimit === null) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/columns/${column.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wipLimit: parseInt(newLimit, 10) })
      });
      if (response.ok) onRefresh();
    } catch (err) {
      console.error("WIP update failed", err);
    }
  };

  const handleDeleteColumn = async () => {
    if (!window.confirm(`Delete ${column.title}? This cannot be undone.`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/columns/${column.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (response.ok) onRefresh();
    } catch (err) {
      console.error("Column deletion failed", err);
    }
  };

  return (
    <div className={styles.column} onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className={styles.headerWrapper}>
        <ColumnHeader title={column.title} currentCount={column.tasks.length} limit={column.wipLimit} />
        
        {isAdmin && (
          <div className={styles.menuContainer}>
            <button className={styles.dotsBtn} onClick={() => setShowMenu(!showMenu)}>⋮</button>
            {showMenu && (
              <div className={styles.dropdown} onMouseLeave={() => setShowMenu(false)}>
                <button onClick={handleUpdateWip}>Change WIP Limit</button>
                <button className={styles.deleteOption} onClick={handleDeleteColumn}>Delete Column</button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.taskList}>
        {column.tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            columnId={column.id} 
            // Pass the delete logic down to the card
            onDelete={() => onDeleteTask(task.id, column.id)} 
          />
        ))}
      </div>

      {canCreate && (
        <button className={styles.addCardBtn} onClick={() => setIsModalOpen(true)}>
          <span className={styles.plus}>+</span> Create Task
        </button>
      )}

      {isModalOpen && (
        <CreateTaskModal 
          columnId={column.id} 
          onClose={() => setIsModalOpen(false)} 
          onAdd={handleCreateTaskInternal} // Call the wrapper
        />
      )}
    </div>
  );
};

export default KanbanColumn;