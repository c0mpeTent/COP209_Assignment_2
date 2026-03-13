import React from "react";
import { useNavigate, useParams } from "react-router-dom"; // Import routing hooks
import styles from "./ProjectSections.module.css";
import type {Board} from "../../types/kanban"

interface WorkflowProps {
  //workflows: string[];
  userRole: string;
  boards: Board[] ,
  onAdd: (name: string) => void;
}

const WorkflowSection: React.FC<WorkflowProps> = ({ userRole, boards, onAdd }) => {
  const navigate = useNavigate();
  const { id: projectId } = useParams(); // Get the current project ID from the URL
  
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
            <input type="text" placeholder="New board name..." id="wfInput" />
            <button 
              className={styles.addBtn}
              onClick={() => {
                const el = document.getElementById("wfInput") as HTMLInputElement;
                if(el.value) onAdd(el.value);
                el.value = "";
              }}
            >
              + Create
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
            
            <button 
              className={styles.showBtn} 
              // 3. Pass the actual board.id here
              onClick={() => handleShowWorkflow(board.id)}
            >
              Show
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowSection;