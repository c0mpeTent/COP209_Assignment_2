import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Task } from "../../types/kanban";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Task;
  columnId: string;
  onDelete: () => Promise<void>;
  userRole?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  columnId,
  onDelete,
  userRole,
}) => {
  const navigate = useNavigate();
  const { projectId, workflowId } = useParams<{
    projectId: string;
    workflowId: string;
  }>();
  const canModify = userRole !== "PROJECT_VIEWER";
  const [showName, setShowName] = useState(false);

  const openTaskDetails = () => {
    if (!projectId || !workflowId) {
      return;
    }

    navigate(`/project/${projectId}/workflow/${workflowId}/task/${task.id}`);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!canModify) {
      return;
    }

    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("sourceColId", columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={`${styles.card} ${styles[`priority-${task.priority.toLowerCase()}`]}`}
      draggable={canModify}
      onDragStart={handleDragStart}
      onClick={openTaskDetails}
    >
      <div className={styles.cardHeader}>
        <span className={`${styles.typeBadge} ${styles[task.type.toLowerCase()]}`}>
          {task.type}
        </span>

        {canModify && (
          <button
            className={styles.deleteBtn}
            title="Delete Task"
            onClick={(e) => {
              e.stopPropagation();
              void onDelete();
            }}
          >
            ✕
          </button>
        )}
      </div>

      <h4 className={styles.title}>{task.title}</h4>

      {task.description && (
        <p className={styles.descriptionSnippet}>
          {task.description.substring(0, 80)}
          {task.description.length > 80 ? "..." : ""}
        </p>
      )}

      <div className={styles.metaRow}>
        {task.dueDate && (
          <span className={styles.dueDate}>
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <span
            className={`${styles.priorityIndicator} ${styles[task.priority.toLowerCase()]}`}
          />
          <span className={styles.priorityText}>{task.priority}</span>
        </div>

        <div className={styles.footerRight}>
          {task.assignee && (
            <div
              className={styles.assigneeContainer}
              onClick={(e) => {
                e.stopPropagation();
                setShowName((current) => !current);
              }}
            >
              <div className={styles.avatarCircle}>
                {task.assignee.avatarUrl ? (
                  <img src={task.assignee.avatarUrl} className={styles.avatar} />
                ) : (
                  <span>{task.assignee.name[0]}</span>
                )}
              </div>

              {showName && <span className={styles.nameTag}>{task.assignee.name}</span>}
            </div>
          )}

          <button
            className={styles.editBtn}
            title="Open Task"
            onClick={(e) => {
              e.stopPropagation();
              openTaskDetails();
            }}
          >
            ↗
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
