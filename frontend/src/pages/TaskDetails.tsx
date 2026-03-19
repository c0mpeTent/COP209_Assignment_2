import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ActivityTimeline from "../components/ActivityTimeline";
import CommentThread from "../components/CommentThread";
import type {
  BoardMemberOption,
  PriorityType,
  ProjectRole,
  Task,
  TaskDetailsResponse,
  TaskHistoryEntry,
} from "../types/kanban";
import styles from "./TaskDetails.module.css";

type TaskFormState = {
  title: string;
  description: string;
  status: string;
  priority: PriorityType;
  assignee: string;
  dueDate: string;
};

const formatDateForInput = (value?: string | null) => {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().split("T")[0];
};

const TaskDetails: React.FC = () => {
  const { workflowId, taskId } = useParams<{
    projectId: string;
    workflowId: string;
    taskId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [workflowName, setWorkflowName] = useState("Workflow");
  const [viewerRole, setViewerRole] = useState<ProjectRole>("PROJECT_VIEWER");
  const [currentUserId, setCurrentUserId] = useState("");
  const [members, setMembers] = useState<BoardMemberOption[]>([]);
  const [columns, setColumns] = useState<TaskDetailsResponse["columns"]>([]);
  const [formData, setFormData] = useState<TaskFormState | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isReadOnly = viewerRole === "PROJECT_VIEWER";

  const loadTaskDetails = useCallback(async () => {
    if (!workflowId || !taskId) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/task/${workflowId}/${taskId}`,
        {
          credentials: "include",
        }
      );

      const data: TaskDetailsResponse | { message?: string } = await response.json();
      if (!response.ok) {
        throw new Error("message" in data ? data.message || "Could not load task" : "Could not load task");
      }

      const details = data as TaskDetailsResponse;
      setTask(details.task);
      setWorkflowName(details.workflowName);
      setViewerRole(details.userRole);
      setCurrentUserId(details.currentUserId);
      setMembers(details.members);
      setColumns(details.columns.sort((left, right) => left.order - right.order));
      setFormData({
        title: details.task.title,
        description: details.task.description || "",
        status: details.task.status,
        priority: details.task.priority,
        assignee: details.task.assignee?.email || "",
        dueDate: formatDateForInput(details.task.dueDate),
      });
    } catch (error) {
      console.error("Task details load failed", error);
      alert(error instanceof Error ? error.message : "Could not load task");
    } finally {
      setLoading(false);
    }
  }, [taskId, workflowId]);

  useEffect(() => {
    void loadTaskDetails();
  }, [loadTaskDetails]);

  const currentColumn = useMemo(
    () => columns.find((column) => column.id === task?.status),
    [columns, task?.status]
  );

  const statusOptions = useMemo(() => {
    if (!task) {
      return [];
    }

    if (task.type === "STORY") {
      return columns;
    }

    return columns.filter((column) =>
      currentColumn ? column.order >= currentColumn.order : true
    );
  }, [columns, currentColumn, task]);

  const priorityToneClass = useMemo(() => {
    switch (task?.priority) {
      case "CRITICAL":
        return styles.priorityCritical;
      case "HIGH":
        return styles.priorityHigh;
      case "MEDIUM":
        return styles.priorityMedium;
      case "LOW":
        return styles.priorityLow;
      default:
        return "";
    }
  }, [task?.priority]);

  const historyEntries = useMemo<TaskHistoryEntry[]>(
    () => task?.history ?? [],
    [task?.history]
  );

  const handleSaveTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!workflowId || !taskId || !formData) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update-task/${workflowId}/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            assignee: formData.assignee,
            dueDate: formData.dueDate || null,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not update task");
      }

      await loadTaskDetails();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Task update failed", error);
      alert(error instanceof Error ? error.message : "Could not update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateComment = async (text: string) => {
    if (!workflowId || !taskId) {
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_ORIGIN}/api/comment/task/${workflowId}/${taskId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Could not add comment");
    }

    await loadTaskDetails();
  };

  const handleUpdateComment = async (commentId: string, text: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_ORIGIN}/api/comment/${commentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Could not update comment");
    }

    await loadTaskDetails();
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) {
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_ORIGIN}/api/comment/${commentId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Could not delete comment");
    }

    await loadTaskDetails();
  };

  if (loading || !task || !formData) {
    return <div className={styles.loader}>Loading task details...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={`${styles.headerCard} ${priorityToneClass}`}>
        <div>
          <p className={styles.eyebrow}>{workflowName}</p>
          <h1 className={styles.title}>{task.title}</h1>
          <p className={styles.subtitle}>
            {task.type} · Created by {task.reporter?.name || "Unknown"} · Last updated{" "}
            {new Date(task.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className={styles.headerSide}>
          <div className={styles.headerBadges}>
            {/* <span className={styles.badge}>
              {columns.find((column) => column.id === task.status)?.name || "Unknown"}
            </span> */}
          </div>
          {!isReadOnly && (
            <button
              className={styles.editTaskButton}
              onClick={() => setIsEditModalOpen(true)}
              title="Edit task details"
            >
              ✎ Edit Task
            </button>
          )}
        </div>
      </header>

      <section className={styles.metaPanel}>
        
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span>Current Status</span>
            <strong>{currentColumn?.name || "Unknown"}</strong>
          </div>
          <div className={styles.metaItem}>
            <span>Assigned To</span>
            <strong>{task.assignee?.name || "Unassigned"}</strong>
          </div>
          <div className={styles.metaItem}>
            <span>Due Date</span>
            <strong>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
            </strong>
          </div>
          <div className={styles.metaItem}>
            <span>Created At</span>
            <strong>{new Date(task.createdAt).toLocaleString()}</strong>
          </div>
          <div className={styles.metaItem}>
            <span>Resolved At</span>
            <strong>
              {task.resolvedAt ? new Date(task.resolvedAt).toLocaleString() : "Not resolved"}
            </strong>
          </div>
          <div className={styles.metaItem}>
            <span>Closed At</span>
            <strong>
              {task.closedAt ? new Date(task.closedAt).toLocaleString() : "Not closed"}
            </strong>
          </div>
        </div>
      </section>

      <div className={styles.layoutGrid}>
        <div className={styles.mainColumn}>
          <CommentThread
            comments={task.comments ?? []}
            currentUserId={currentUserId}
            members={members}
            isReadOnly={isReadOnly}
            onCreate={handleCreateComment}
            onUpdate={handleUpdateComment}
            onDelete={handleDeleteComment}
          />
        </div>

        <div className={styles.sideColumn}>
          <ActivityTimeline entries={historyEntries} />
        </div>
      </div>

      {isEditModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Edit Task Details</h2>
                <p className={styles.sectionSubtitle}>
                  Update core task information here without leaving the collaboration view.
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSaveTask}>
              <label className={styles.field}>
                <span>Title</span>
                <input
                  value={formData.title}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    setFormData((current) =>
                      current ? { ...current, title: event.target.value } : current
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Description</span>
                <textarea
                  rows={6}
                  value={formData.description}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    setFormData((current) =>
                      current ? { ...current, description: event.target.value } : current
                    )
                  }
                />
              </label>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Status</span>
                  <select
                    value={formData.status}
                    disabled={isReadOnly || task.type === "STORY"}
                    onChange={(event) =>
                      setFormData((current) =>
                        current ? { ...current, status: event.target.value } : current
                      )
                    }
                  >
                    {statusOptions.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Priority</span>
                  <select
                    value={formData.priority}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setFormData((current) =>
                        current
                          ? {
                              ...current,
                              priority: event.target.value as PriorityType,
                            }
                          : current
                      )
                    }
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </label>
              </div>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Assignee</span>
                  <select
                    value={formData.assignee}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setFormData((current) =>
                        current ? { ...current, assignee: event.target.value } : current
                      )
                    }
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.email}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Due Date</span>
                  <input
                    type="date"
                    value={formData.dueDate}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setFormData((current) =>
                        current ? { ...current, dueDate: event.target.value } : current
                      )
                    }
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    void loadTaskDetails();
                    setIsEditModalOpen(false);
                  }}
                >
                  Cancel
                </button>
                {!isReadOnly && (
                  <button type="submit" className={styles.primaryButton} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetails;
