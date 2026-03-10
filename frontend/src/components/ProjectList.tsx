import React from "react";
import styles from "./ProjectList.module.css";

// Define the 'Props' (what data this component expects)
interface Project {
  id: string;
  name: string;
  description?: string;
}

interface ProjectListProps {
  items: Project[];
}

const ProjectList: React.FC<ProjectListProps> = ({ items }) => {
  return (
    <section className={styles.container}>
      <h3 className={styles.title}>Your Projects</h3>
      
      <div className={styles.grid}>
        {items.length > 0 ? (
          items.map((project) => (
            <div key={project.id} className={styles.card}>
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
            <p>No projects yet. Start by creating your first one!</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectList;