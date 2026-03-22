import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Task } from "../../types/kanban";
import { getDueDateDisplay } from "../../utils/dueDate";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Task;
  columnId: string;
  currentUserId: string;
  onDelete: () => Promise<void>;
  userRole?: string;
  isBoardBusy?: boolean;
  storyTitle?: string;
 
}

const getResolvedAvatarUrl = (avatarUrl?: string) => {
  if (!avatarUrl) {
    return "";
  }

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    if (avatarUrl.includes("undefined/uploads/")) {
      return avatarUrl.replace(
        "undefined/uploads/",
        `${import.meta.env.VITE_BACKEND_ORIGIN}/uploads/`
      );
    }

    return avatarUrl;
  }

  if (avatarUrl.startsWith("undefined/uploads/")) {
    return avatarUrl.replace(
      "undefined/uploads/",
      `${import.meta.env.VITE_BACKEND_ORIGIN}/uploads/`
    );
  }

  if (avatarUrl.startsWith("/uploads/")) {
    return `${import.meta.env.VITE_BACKEND_ORIGIN}${avatarUrl}`;
  }

  if (avatarUrl.startsWith("uploads/")) {
    return `${import.meta.env.VITE_BACKEND_ORIGIN}/${avatarUrl}`;
  }

  return avatarUrl;
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  columnId,
  currentUserId,
  storyTitle,
  onDelete,
  userRole,
  isBoardBusy = false,
}) => {
  const navigate = useNavigate();
  const { projectId, workflowId } = useParams<{
    projectId: string;
    workflowId: string;
  }>();
  const canModify = userRole !== "PROJECT_VIEWER" && !isBoardBusy;
  const canDelete =
    userRole === "GLOBAL_ADMIN" ||
    userRole === "PROJECT_ADMIN" ||
    task.reporterId === currentUserId;
  const [showName, setShowName] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const resolvedAvatarUrl = getResolvedAvatarUrl(task.assignee?.avatarUrl);
  const dueDateDisplay = getDueDateDisplay(task.dueDate);

  const openTaskDetails = () => {
    if (!projectId || !workflowId) {
      return;
    }
    navigate(`/project/${projectId}/workflow/${workflowId}/task/${task.id}`);
  };

  const openStoryDetails = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!projectId || !workflowId || !task.parentStoryId) {
      return;
    }

    navigate(`/project/${projectId}/workflow/${workflowId}/task/${task.parentStoryId}`);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!canModify) { return;
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

        {canModify && canDelete && (
          <button
            className={styles.deleteBtn}
            title="Delete Task"
            disabled={isBoardBusy}
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

      <div className={styles.metaRow}>
        {task.dueDate && (
          <span
            className={`${styles.dueDate} ${
              dueDateDisplay.isOverdue ? styles.overdueDate : ""
            }`}
          >
            {dueDateDisplay.isOverdue ? dueDateDisplay.label : `Due ${dueDateDisplay.label}`}
          </span>
        )}
        {storyTitle && (
          <button className={styles.storyLink} onClick={openStoryDetails}>
            STORY: {storyTitle}
          </button>
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
                {resolvedAvatarUrl && !avatarLoadFailed ? (
                  <img
                    src={resolvedAvatarUrl}
                    className={styles.avatar}
                    alt={task.assignee.name}
                    onError={() => setAvatarLoadFailed(true)}
                  />
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
            disabled={isBoardBusy}
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
