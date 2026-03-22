import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ProjectList.module.css";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  isArchived?: boolean;
  role?: string;
}

interface ProjectListProps {
  items: Project[];
  title: string;
  emptyMessage: string;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  pendingDeleteId?: string | null;
  pendingArchiveId?: string | null;
  onDelete: (id: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  items,
  title,
  emptyMessage,
  onDelete,
  onArchiveToggle,
  pendingDeleteId = null,
  pendingArchiveId = null,
}) => {
  const navigate = useNavigate();

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete the project "${name}"?`
    );
    if (confirmed) {
      onDelete(id);
    }
  };

  const handleArchiveToggle = (
    e: React.MouseEvent,
    projectId: string,
    name: string,
    isArchived: boolean
  ) => {
    e.stopPropagation();
    const action = isArchived ? "restore" : "archive";
    const confirmed = window.confirm(
      `Do you want to ${action} the project "${name}"?`
    );

    if (confirmed) {
      onArchiveToggle(projectId, isArchived);
    }
  };

  const handleOpenProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  return (
    <section className={styles.container}>
      <h3 className={styles.title}>{title}</h3>

      <div className={styles.grid}>
        {items.length > 0 ? (
          items.map((project) => {
            const canManageProject =
              project.role === "GLOBAL_ADMIN" || project.role === "PROJECT_ADMIN";
            const canDeleteProject = project.role === "GLOBAL_ADMIN";
            const isDeleting = pendingDeleteId === project.id;
            const isArchiving = pendingArchiveId === project.id;

            return (
              <div
                key={project.id}
                className={`${styles.card} ${
                  project.isArchived ? styles.archivedCard : ""
                }`}
              >
                {canDeleteProject && (
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDelete(e, project.id, project.name)}
                    title="Delete Project"
                    disabled={isDeleting || isArchiving}
                  >
                    {isDeleting ? "…" : "\u00d7"}
                  </button>
                )}

                <div className={styles.cardHeader}>
                  <h4>{project.name}</h4>
                  <span
                    className={`${styles.tag} ${
                      project.isArchived ? styles.archivedTag : ""
                    }`}
                  >
                    {project.isArchived ? "Archived" : "Active"}
                  </span>
                </div>
                <p className={styles.desc}>
                  {project.description || "No description provided."}
                </p>
                <div className={styles.cardFooter}>
                  <button
                    className={styles.viewBtn}
                    onClick={() => handleOpenProject(project.id)}
                    disabled={isDeleting || isArchiving}
                  >
                    Open Project
                  </button>
                  {canManageProject && (
                    <button
                      className={styles.archiveBtn}
                      disabled={isDeleting || isArchiving}
                      onClick={(e) =>
                        handleArchiveToggle(
                          e,
                          project.id,
                          project.name,
                          Boolean(project.isArchived)
                        )
                      }
                    >
                      {isArchiving ? project.isArchived
                          ? "Restoring..."
                          : "Archiving..."
                        : project.isArchived
                          ? "Restore"
                          : "Archive"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.empty}>
            <h4 className={styles.message}>{emptyMessage}</h4>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectList;
