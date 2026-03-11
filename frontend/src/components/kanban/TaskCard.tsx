import React from "react";
import styles from "./Kanban.module.css";

interface Task {
  id: string;
  title: string;
  priority: "Low" | "Medium" | "High" | "Critical"; 
  type: "Story" | "Task" | "Bug"; 
}

interface TaskCardProps {
  task: Task;
  columnId: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, columnId }) => {
  const handleDragStart = (e: React.DragEvent) => {
    // 1. Store Task ID and Source Column ID in the dataTransfer object [cite: 51]
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("sourceColId", columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div 
      className={`${styles.taskCard} ${styles[task.priority.toLowerCase()]}`}
      draggable // 2. Mandatory attribute for native DnD 
      onDragStart={handleDragStart}
    >
      <div className={styles.taskTypeTag}>{task.type}</div>
      <h4 className={styles.taskTitle}>{task.title}</h4>
      <div className={styles.taskFooter}>
        <span className={styles.priorityLabel}>Priority: {task.priority}</span>
      </div>
    </div>
  );
};

export default TaskCard;