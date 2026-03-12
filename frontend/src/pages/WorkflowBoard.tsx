import React, { useState } from "react";
import { useParams } from "react-router-dom";
import KanbanColumn from "../components/kanban/KhanbanColumn";
import type { ColumnData, Task } from "../types/kanban"; // Recommended to keep types modular
import styles from "./WorkflowBoard.module.css";

// 1. Move static data outside the component to prevent recreation on every render
const DEFAULT_COLUMNS: ColumnData[] = [
  { id: "todo", title: "To Do", wipLimit: 5, tasks: [] },
  { id: "inprogress", title: "In Progress", wipLimit: 3, tasks: [] },
  { id: "review", title: "Review", wipLimit: 3, tasks: [] },
  { id: "done", title: "Done", wipLimit: 10, tasks: [] },
];

const WorkflowBoard: React.FC = () => {
  const { projectId, workflowName } = useParams<{ projectId: string; workflowName: string }>();
  
  // 2. Initialize state directly. No useEffect needed for initial constants!
  const [columns, setColumns] = useState<ColumnData[]>(DEFAULT_COLUMNS);

  const handleMoveTask = (taskId: string, sourceColId: string, targetColId: string) => {
    // WIP Limit Logic remains the same
    const targetCol = columns.find(c => c.id === targetColId);
    
    if (targetCol && targetCol.tasks.length >= targetCol.wipLimit) {
      alert(`WIP Limit reached for ${targetCol.title}! Move blocked.`); // 
      return;
    }

    // Actual state update logic for moving tasks (Native DnD)
    setColumns((prevColumns: ColumnData[]) => {
      // Find the task in the source column
      let movedTask: Task | undefined;
      const updatedColumns = prevColumns.map(col => {
        if (col.id === sourceColId) {
          movedTask = col.tasks.find(t => t.id === taskId);
          return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
        }
        return col;
      });

      // Add it to the target column
      return updatedColumns.map(col => {
        if (col.id === targetColId && movedTask) {
          return { ...col, tasks: [...col.tasks, movedTask] };
        }
        return col;
      });
    });
  };

  return (
    <div className={styles.boardWrapper}>
      <header className={styles.boardHeader}>
        <h1>{workflowName?.replace('-', ' ').toUpperCase()}</h1>
        <h3>{projectId}</h3>
      </header>

      <div className={styles.kanbanContainer}>
        {columns.map(col => (
          <KanbanColumn 
            key={col.id}
            column={col}
            onMoveTask={handleMoveTask}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkflowBoard;