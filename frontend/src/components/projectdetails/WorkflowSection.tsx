import React from "react";
import { useNavigate, useParams } from "react-router-dom"; // Import routing hooks
import styles from "./ProjectSections.module.css";
import type {Board} from "../../types/kanban"

interface WorkflowProps {
  //workflows: string[];
  userRole: string;
  boards: Board[] ,
  onAdd: (name: string) => Promise<void>;
  onDelete: (workflowId: string, workflowName: string) => Promise<void>;
  isAdding?: boolean;
  deletingWorkflowId?: string | null;
}

const WorkflowSection: React.FC<WorkflowProps> = ({
  userRole,
  boards,
  onAdd,
  onDelete,
  isAdding = false,
  deletingWorkflowId = null,
}) => {
  const navigate = useNavigate();
  const { id: projectId } = useParams(); // Get the current project ID from the URL
  const [workflowNameInput, setWorkflowNameInput] = React.useState("");
  
  const canAddWorkflow = userRole === "GLOBAL_ADMIN" || userRole === "PROJECT_ADMIN";

  const handleShowWorkflow = (workflowId: string) => {
    // Navigate using the board's unique ID
    // URL Format matches App.tsx: /project/:projectId/workflow/:boardId
    navigate(`/project/${projectId}/workflow/${workflowId}`);
  };

  return (
    <div className={styles.cardws}>
      <div className={styles.cardHeader}>
        <h2 className={styles.mainheading}>Workflows & Boards</h2>
        {canAddWorkflow && (
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="New board name..."
              value={workflowNameInput}
              disabled={isAdding}
              onChange={(event) => setWorkflowNameInput(event.target.value)}
            />
            <button 
              className={styles.addBtn}
              disabled={isAdding}
              onClick={() => {
                if (workflowNameInput.trim()) {
                  void onAdd(workflowNameInput.trim()).then(() => setWorkflowNameInput(""));
                }
              }}
            >
              {isAdding ? "Creating..." : "+ Create"}
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.gridws}>
        {/* 2. Map over 'boards' instead of 'workflows' */}
        {boards.map((board) => (
          <div key={board.id} className={styles.boardCard}>
            <div className={styles.boardInfo}>
              <span className={styles.boardIcon}>📋</span>
              <span className={styles.boardName}>{board.name}</span>
            </div>

            <div className={styles.boardActions}>
              <button
                className={styles.showBtn}
                onClick={() => handleShowWorkflow(board.id)}
                disabled={deletingWorkflowId === board.id}
              >
                Show
              </button>
              {canAddWorkflow && (
                <button
                  className={styles.deleteBoardBtn}
                  disabled={deletingWorkflowId === board.id}
                  onClick={() => void onDelete(board.id, board.name)}
                >
                  {deletingWorkflowId === board.id ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowSection;
