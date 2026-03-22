import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ActivityTimeline from "../components/ActivityTimeline";
import CommentThread from "../components/CommentThread";
import { getDueDateDisplay } from "../utils/dueDate";
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

type AvatarNameProps = {
  user?: Pick<Task, "assignee" | "reporter">["assignee"] | Pick<Task, "assignee" | "reporter">["reporter"];
  fallbackText: string;
};

const AvatarName: React.FC<AvatarNameProps> = ({ user, fallbackText }) => {

  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const resolvedAvatarUrl = getResolvedAvatarUrl(user?.avatarUrl);
  const displayName = user?.name || fallbackText;

  return (
    <span className={styles.avatarName}>
      {user ? (
        <span className={styles.smallAvatarCircle}>
          {resolvedAvatarUrl && !avatarLoadFailed ? (
            <img
              src={resolvedAvatarUrl}
              alt={displayName}
              className={styles.smallAvatarImage}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : ( <span>{displayName[0]}</span> )}
        </span>
      ) : null}
      <span className={styles.personName}>{displayName}</span>
    </span>
  );
};



const TaskDetails: React.FC = () => {
  const navigate = useNavigate();
  const { projectId, workflowId, taskId } = useParams<{
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

  const [childItems, setChildItems] = useState<Task[]>([]);
  const [stories, setStories] = useState<Task[]>([]);
  const [formData, setFormData] = useState<TaskFormState | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [isAssigningStory, setIsAssigningStory] = useState(false);

  const isReadOnly =viewerRole === "PROJECT_VIEWER";

  const loadTaskDetails = useCallback(async () => {
    if (!workflowId || !taskId) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/task/${workflowId}/${taskId}`,
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
      setChildItems(details.childItems ?? []);
      setStories(details.stories ?? []);

      setSelectedStoryId(details.task.parentStoryId ?? "");
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

  useEffect(() => { void loadTaskDetails(); }, [loadTaskDetails]);

  const currentColumn = useMemo(
    () => columns.find((column) => column.id === task?.status),
    [columns, task?.status]
  );
  const dueDateDisplay = getDueDateDisplay(task?.dueDate);

  const statusOptions = useMemo(() => {
    if (!task) {
      return [];
    }

    return columns;
  }, [columns, task]);

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

  const currentStory = useMemo(
    () => stories.find((story) => story.id === task?.parentStoryId) ?? null,
    [stories, task?.parentStoryId]
  );

  const childItemsWithStatus = useMemo(
    () => childItems.map((childItem) => ({
        ...childItem,
        statusLabel:
          columns.find((column) => column.id === childItem.status)?.name || "Unknown",
      })),
    [childItems, columns]
  );

  const handleSaveTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!workflowId || !taskId || !formData) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update-task/${workflowId}/${taskId}`,
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

    const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/comment/task/${workflowId}/${taskId}`,
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
    const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/comment/${commentId}`,
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

  const openStoryPage = () => {
    if (!projectId || !workflowId || !currentStory) {
      return;
    }

    navigate(`/project/${projectId}/workflow/${workflowId}/task/${currentStory.id}`);
  };

  const handleAssignStory = async () => {
    if (!workflowId || !taskId || task?.type === "STORY") {
      return;
    }

    try {
      setIsAssigningStory(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update-task/${workflowId}/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            parentStoryId: selectedStoryId || null,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not update story assignment");
      }

      await loadTaskDetails();
      setIsStoryModalOpen(false);

    } catch (error) {
      console.error("Story assignment failed", error);
      alert(error instanceof Error ? error.message : "Could not update story assignment");
    } finally {
      setIsAssigningStory(false);
    }
  };

  if (loading || !task || !formData) {
    return <div className={styles.loader}>Loading task details...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={`${styles.headerCard} ${priorityToneClass}`}>
        <div>
          <p className={styles.eyebrow}> {task.type}</p>
          <h1 className={styles.title}>{task.title}</h1>
          <p className={styles.subtitle}>
            <span>{workflowName}</span>
            <span className={styles.subtitleDot}>·</span>
            <span className={styles.subtitlePersonBlock}>
              <span>Created by</span>
              <AvatarName user={task.reporter} fallbackText="Unknown" />
            </span>
            <span className={styles.subtitleDot}>·</span>
            <span>Last updated {new Date(task.updatedAt).toLocaleString()}</span>
          </p>
        </div>
        <div className={styles.headerSide}>
          <div className={styles.headerBadges}>
            {currentStory && task.type !== "STORY" && (
              <button type="button" className={styles.storyLinkTag}
                onClick={openStoryPage}
              >
                Belongs to Story "{currentStory.title}"
              </button>
            )}
          </div>
          {!isReadOnly && (
            <div className={styles.headerActionRow}>
              {task.type !== "STORY" && (
                <button type="button"
                  className={styles.assignStoryButton}
                  onClick={() => setIsStoryModalOpen(true)}
                  title="Assign this item to a story"
                >
                  {currentStory ? "Change Story" : "Assign To Story"}
                </button>
              )}
              <button
                className={styles.editTaskButton}
                onClick={() => setIsEditModalOpen(true)}
                title="Edit task details"
              >
                ✎ Edit Task
              </button>
            </div>
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
            <div className={styles.personValue}>
              <AvatarName user={task.assignee} fallbackText="Unassigned" />
            </div>
          </div>
          <div className={styles.metaItem}>
            <span>Due Date</span>
            <strong className={dueDateDisplay.isOverdue ? styles.overdueValue : undefined}>
              {dueDateDisplay.label}
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

      {task.type === "STORY" && (
        <section className={styles.storyChildrenPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Story Work Items</h2>
              <p className={styles.sectionSubtitle}>
                Tasks and bugs linked to this story.
              </p>
            </div>
          </div>

          {childItemsWithStatus.length > 0 ? (
            <div className={styles.storyChildrenGrid}>
              {childItemsWithStatus.map((childItem) => (
                <button
                  key={childItem.id}
                  type="button"
                  className={styles.storyChildCard}
                  onClick={() =>
                    navigate(
                      `/project/${projectId}/workflow/${workflowId}/task/${childItem.id}`
                    )
                  }
                >
              <strong className={styles.storyChildTitle}>{childItem.title}</strong>
              <div className={styles.storyChildMeta}>
                <span className={styles.storyChildType}>{childItem.type}</span>
                <span className={styles.storyChildStatus}>{childItem.statusLabel}</span>
              </div>
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.storyChildrenEmpty}>
              No tasks or bugs have been linked to this story yet.
            </p>
          )}
        </section>
      )}

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

      {isStoryModalOpen && task.type !== "STORY" && (
        <div className={styles.modalOverlay} onClick={() => setIsStoryModalOpen(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Assign To Story</h2>
                <p className={styles.sectionSubtitle}>
                  Link this work item to an existing story in the same workflow.
                </p>
              </div>
            </div>

            <div className={styles.form}>
              <label className={styles.field}>
                <span>Story</span>
                <select
                  value={selectedStoryId}
                  disabled={isAssigningStory}
                  onChange={(event) => setSelectedStoryId(event.target.value)}
                >
                  <option value="">No Story</option>
                  {stories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setSelectedStoryId(task.parentStoryId ?? "");
                    setIsStoryModalOpen(false);
                  }}
                  disabled={isAssigningStory}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => void handleAssignStory()}
                  disabled={isAssigningStory}
                >
                  {isAssigningStory ? "Saving..." : "Save Story Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetails;
