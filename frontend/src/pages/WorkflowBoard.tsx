import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import KanbanColumn from "../components/kanban/KhanbanColumn";
import type { ColumnData, Task, BoardFetchResponse, CreateTaskPayload } from "../types/kanban"; // Recommended to keep types modular
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
  
  // 1. Add a loading state
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<ColumnData[]>(DEFAULT_COLUMNS);
  const [viewerRole, setViewerRole] = useState("GLOBAL_ADMIN");

  const fetchBoardData = useCallback(async () => {
    // Only set loading if it's not already true (prevents flicker on refresh)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/boards/${workflowName}`, 
        { credentials: "include" }
      );

      if (response.ok) {
        const data: BoardFetchResponse = await response.json();
        
        // Batch these updates
        setViewerRole(data.userRole || "PROJECT_VIEWER");
        const initializedColumns: ColumnData[] = data.columns
          .sort((a, b) => a.order - b.order)
          .map(col => ({
            id: col.id,
            title: col.name,
            wipLimit: col.wipLimit ?? 0,
            tasks: data.tasks.filter(task => task.status === col.name) 
          }));

        setColumns(initializedColumns);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false); // End loading state
    }
  }, [projectId, workflowName]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // 2. Conditional return to prevent cascading render of the board
  if (loading) {
    return <div className={styles.loading}>Loading Board...</div>;
  }

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
  
  // 1. Create Task Function
  const handleCreateTask = async (columnId: string, payload: CreateTaskPayload) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          ...payload, 
          status: columnId // Backend uses column status for placement [cite: 127]
        })
      });

      if (response.ok) {
        const newTask = await response.json();
        
        // Update local state to show the new task in the correct column
        setColumns(prev => prev.map(col => {
          if (col.id === columnId) {
            return { ...col, tasks: [...col.tasks, newTask] };
          }
          return col;
        }));
      } else {
        const error = await response.json();
        alert(`Failed to create task: ${error.message}`);
      }
    } catch (err) {
      console.error("Task creation error:", err);
    }
  };

  // 2. Delete Task Function
  const handleDeleteTask = async (taskId: string, columnId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        // Remove task from local state
        setColumns(prev => prev.map(col => {
          if (col.id === columnId) {
            return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
          }
          return col;
        }));
      } else {
        alert("Failed to delete task.");
      }
    } catch (err) {
      console.error("Task deletion error:", err);
    }
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
            // NEW: Pass the userRole state from your parent
            userRole={viewerRole} 
            // NEW: Pass a function to re-fetch the board data
            onRefresh={fetchBoardData} 
            onMoveTask={handleMoveTask}
            // FIX: Explicitly type the payload to fix ts(2345)
            onCreateTask={(columnId: string, payload: CreateTaskPayload) => handleCreateTask(columnId, payload)} 
            onDeleteTask={(taskId: string, columnId: string) => handleDeleteTask(taskId, columnId)}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkflowBoard;