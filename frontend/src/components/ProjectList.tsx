import React from "react";
import styles from "./ProjectList.module.css";

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface ProjectListProps {
  items: Project[];
  onDelete: (id: string) => void; // Added delete handler prop
}

const ProjectList: React.FC<ProjectListProps> = ({ items, onDelete }) => {
  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Prevents clicking 'X' from also triggering 'Open Board'
    const confirmed = window.confirm(`Are you sure you want to delete the project "${name}"?`);
    if (confirmed) {
      onDelete(id);
    }
  };

  return (
    <section className={styles.container}>
      <h3 className={styles.title}>Your Projects</h3>
      
      <div className={styles.grid}>
        {items.length > 0 ? (
          items.map((project) => (
            <div key={project.id} className={styles.card}>
              {/* Delete Button (X) */}
              <button 
                className={styles.deleteBtn} 
                onClick={(e) => handleDelete(e, project.id, project.name)}
                title="Delete Project"
              >
                &times;
              </button>

              <div className={styles.cardHeader}>
                <h4>{project.name}</h4>
                <span className={styles.tag}>Active</span>
              </div>
              <p className={styles.desc}>
                {project.description || "No description provided."}
              </p>
              <div className={styles.cardFooter}>
                <button className={styles.viewBtn}>Open Board</button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            <h4 className={styles.message}>No projects yet. Start by creating your first one!</h4>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectList;