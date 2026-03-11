import React from "react";
import { useNavigate, useParams } from "react-router-dom"; // Import routing hooks
import styles from "./ProjectSections.module.css";

interface WorkflowProps {
  workflows: string[];
  userRole: string;
  onAdd: (name: string) => void;
}

const WorkflowSection: React.FC<WorkflowProps> = ({ workflows, userRole, onAdd }) => {
  const navigate = useNavigate();
  const { id: projectId } = useParams(); // Get the current project ID from the URL
  
  const canAddWorkflow = userRole === "GLOBAL_ADMIN" || userRole === "PROJECT_ADMIN";

  const handleShowWorkflow = (workflowName: string) => {
    // Navigate to the kanban board for this specific workflow
    // Format: /project/1/workflow/Frontend-Sprint
    const formattedName = workflowName.replace(/\s+/g, '-').toLowerCase();
    navigate(`/project/${projectId}/workflow/${formattedName}`);
  };

  return (
    <div className={styles.cardws}>
      <div className={styles.cardHeader}>
        <h2>Workflows & Boards</h2>
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
        {workflows.map((wf, i) => (
          <div key={i} className={styles.boardCard}>
            <div className={styles.boardInfo}>
              <span className={styles.boardIcon}>📋</span>
              <span className={styles.boardName}>{wf}</span>
            </div>
            
            {/* The "Show" button on the far right */}
            <button 
              className={styles.showBtn} 
              onClick={() => handleShowWorkflow(wf)}
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