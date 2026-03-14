import React from 'react';
import type { Task } from '../../types/kanban'; // Ensure this matches your shared types file
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: Task;
  columnId: string;
  onEdit: (task: Task) => void; // New prop for edit functionality
  onDelete: () => Promise<void>;
  userRole?: string; // Optional: to hide delete button for viewers
}

const TaskCard: React.FC<TaskCardProps> = ({ task, columnId, onDelete, onEdit, userRole }) => {
  
  // RBAC: Only Admins and Members can delete tasks
  const canModify = userRole !== "PROJECT_VIEWER";

  const handleDragStart = (e: React.DragEvent) => {
    // Required for Native DnD to identify the task and its origin
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("sourceColId", columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div 
      className={`${styles.card} ${styles[`priority-${task.priority.toLowerCase()}`]}`}
      draggable={canModify} // Disable dragging for viewers
      onDragStart={handleDragStart}
    >
      <div className={styles.cardHeader}>
        {/* Dynamic class based on Task Type (Story, Task, Bug) */}
        <span className={`${styles.typeBadge} ${styles[task.type.toLowerCase()]}`}>
          {task.type}
        </span>
        
        {canModify && (
          <>
            <button 
            className={styles.editBtn} 
            title="Edit Task"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task); // New prop function
            }}
          >
            ✎
          </button>
          <button 
            className={styles.deleteBtn} 
            title="Delete Task"
            onClick={(e) => {
              e.stopPropagation(); // Stops the event from bubbling to the card itself
              onDelete();
            }}
          >
            ✕
          </button>
        </>
        )}
      </div>
      
      <h4 className={styles.title}>{task.title}</h4>
      
      {task.description && (
        <p className={styles.descriptionSnippet}>
          {task.description.substring(0, 60)}{task.description.length > 60 ? '...' : ''}
        </p>
      )}
      
      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <span className={`${styles.priorityIndicator} ${styles[task.priority.toLowerCase()]}`} />
          <span className={styles.priorityText}>{task.priority}</span>
        </div>
        
        {task.assignee && (
          <div className={styles.assigneeWrapper} title={`Assigned to ${task.assignee}`}>
            <span className={styles.avatar}>👤</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;