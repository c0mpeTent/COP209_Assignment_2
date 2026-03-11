import React from "react";
import TaskCard from "./TaskCard";
import ColumnHeader from "./ColumnHeader";
import styles from "./Kanban.module.css";

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
  
  const handleDragOver = (e: React.DragEvent) => {
    // 3. Mandatory: Must prevent default to allow drop [cite: 51]
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const sourceColId = e.dataTransfer.getData("sourceColId");

    // 4. Don't trigger move if dropped in the same column
    if (sourceColId !== column.id) {
      onMoveTask(taskId, sourceColId, column.id);
    }
  };

  return (
    <div 
      className={styles.column}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ColumnHeader 
        title={column.title} 
        currentCount={column.tasks.length} 
        limit={column.wipLimit} 
      />
      
      <div className={styles.taskList}>
        {column.tasks.map(task => (
          <TaskCard key={task.id} task={task} columnId={column.id} />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;