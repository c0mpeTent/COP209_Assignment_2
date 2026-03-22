import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import KanbanColumn from "../components/kanban/KhanbanColumn";
import CreateTaskModal from "../components/kanban/CreateTaskModal";
import type {
  BoardFetchResponse,
  BoardMemberOption,
  ColumnData,
  ColumnUpdatePayload,
  CreateTaskPayload,
  InvalidTransition,
  ProjectRole,
  Task,
  UpdateTaskPayload,
} from "../types/kanban";
import styles from "./WorkflowBoard.module.css";

type MoveFeedback = {
  tone: "loading" | "success" | "error";
  message: string;
};

const WorkflowBoard: React.FC = () => {
  const navigate = useNavigate();
  const { projectId, workflowId } = useParams<{
    projectId: string;
    workflowId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewerRole, setViewerRole] = useState<ProjectRole>("PROJECT_VIEWER");
  const [currentUserId, setCurrentUserId] = useState("");
  const [workflowName, setWorkflowName] = useState("Workflow");
  const [boardId, setBoardId] = useState("");
  const [boardMembers, setBoardMembers] = useState<BoardMemberOption[]>([]);
  const [leftToRightOnly, setLeftToRightOnly] = useState(false);
  const [resolvedColumnId, setResolvedColumnId] = useState<string | null>(null);
  const [invalidTransitions, setInvalidTransitions] = useState<InvalidTransition[]>([]);
  const [invalidFromColumnId, setInvalidFromColumnId] = useState("");
  const [invalidToColumnId, setInvalidToColumnId] = useState("");
  const [newColName, setNewColName] = useState("");
  const [newColWip, setNewColWip] = useState(0);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showResolvedColumnModal, setShowResolvedColumnModal] = useState(false);
  const [showTransitionRules, setShowTransitionRules] = useState(false);
  const [showTransitionInfo, setShowTransitionInfo] = useState(false);
  const [selectedResolvedColumnId, setSelectedResolvedColumnId] = useState("");
  const [isEditingWorkflowName, setIsEditingWorkflowName] = useState(false);
  const [workflowNameInput, setWorkflowNameInput] = useState("");
  const [isSavingWorkflowName, setIsSavingWorkflowName] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [boardActionLabel, setBoardActionLabel] = useState<string | null>(null);
  const [moveFeedback, setMoveFeedback] = useState<MoveFeedback | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const isWorkflowAdmin =
    viewerRole === "PROJECT_ADMIN" || viewerRole === "GLOBAL_ADMIN";
  const canEditTasks = viewerRole !== "PROJECT_VIEWER";
  const isBoardActionPending = Boolean(boardActionLabel);
  const isMovePending = moveFeedback?.tone === "loading";
  const isBoardBusy = isBoardActionPending || isMovePending;

  const clearFeedbackTimeout = useCallback(() => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  const showTimedMoveFeedback = useCallback(
    (feedback: MoveFeedback, durationMs = 2000) => {
      clearFeedbackTimeout();
      setMoveFeedback(feedback);

      feedbackTimeoutRef.current = window.setTimeout(() => {
        setMoveFeedback(null);
        feedbackTimeoutRef.current = null;
      }, durationMs);
    },
    [clearFeedbackTimeout]
  );

  const fetchBoardData = useCallback(async () => {
    if (!workflowId || !projectId) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/get-workflow/${projectId}/${workflowId}`,
        { credentials: "include" });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Could not load workflow");
      }

      const data: BoardFetchResponse = await response.json();

      setViewerRole(data.userRole || "PROJECT_VIEWER");
      setCurrentUserId(data.currentUserId || "");
      setBoardId(data.id);
      setWorkflowName(data.name);
      setWorkflowNameInput(data.name);
      setBoardMembers(data.members ?? []);
      setLeftToRightOnly(Boolean(data.leftToRightOnly));
      setResolvedColumnId(data.resolvedColumnId ?? null);
      setInvalidTransitions(data.invalidTransitions ?? []);
      setColumns(
        data.columns
          .sort((a, b) => a.order - b.order)
          .map((column) => ({
            id: column.id,
            title: column.name,
            order: column.order,
            wipLimit: column.wipLimit ?? 0,
            tasks: [],
          }))
      );
      setTasks(data.tasks);

      const sortedColumns = data.columns.slice().sort((a, b) => a.order - b.order);
      setInvalidFromColumnId((current) => sortedColumns.some((column) => column.id === current)
          ? current
          : sortedColumns[0]?.id || ""
      );
      setInvalidToColumnId((current) => sortedColumns.some((column) => column.id === current)
          ? current
          : sortedColumns[1]?.id || sortedColumns[0]?.id || ""
      );
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, workflowId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  useEffect(() => () => clearFeedbackTimeout(), [clearFeedbackTimeout]);

  const orderedColumns = useMemo(
    () => columns.slice().sort((a, b) => a.order - b.order),
    [columns]
  );

  const stories = useMemo(
    () => tasks
        .filter((task) => task.type === "STORY")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [tasks]
  );

  const visibleWorkItems = useMemo(
    () =>
      tasks.filter((task) => {
        if (task.type === "STORY") {
          return false;
        }

        return true;
      }),
    [tasks]
  );

  const displayColumns = useMemo(
    () =>
      orderedColumns.map((column) => ({
        ...column,
        tasks: visibleWorkItems.filter((task) => task.status === column.id),
      })),
    [orderedColumns, visibleWorkItems]
  );

  const defaultStoryStatusId = orderedColumns[0]?.id ?? "";

  const effectiveResolvedColumn = useMemo(() => {
    const configuredColumn = resolvedColumnId
        ? orderedColumns.find((column) => column.id === resolvedColumnId) ?? null
        : null;

    if (configuredColumn) {
      return configuredColumn;
    }

    return (
      orderedColumns.find((column) => column.title.trim().toLowerCase() === "done") ??
      orderedColumns[orderedColumns.length - 1] ??
      null
    );
  }, [orderedColumns, resolvedColumnId]);


  const getColumnTitle = useCallback(
    (columnId: string) => orderedColumns.find((column) => column.id === columnId)?.title ?? "Unknown",
    [orderedColumns]
  );

  const invalidTransitionLabels = useMemo(
    () =>
      invalidTransitions.map((transition) => ({
        ...transition,
        fromTitle: getColumnTitle(transition.fromColumnId),
        toTitle: getColumnTitle(transition.toColumnId),
      })),
    [getColumnTitle, invalidTransitions]
  );



  const storyCards = useMemo(
    () =>
      stories.map((story) => ({
        ...story,
        statusLabel: getColumnTitle(story.status),
        canDelete:
          viewerRole === "GLOBAL_ADMIN" ||
          viewerRole === "PROJECT_ADMIN" ||
          story.reporterId === currentUserId,
      })),
    [currentUserId, getColumnTitle, stories, viewerRole]
  );

  const openResolvedColumnModal = () => {
    setSelectedResolvedColumnId(effectiveResolvedColumn?.id ?? "");
    setShowResolvedColumnModal(true);
  };

  const handleUpdateWorkflowName = async () => {
    if (!boardId || !workflowNameInput.trim()) {
      return;
    }

    try {
      setIsSavingWorkflowName(true);
      setBoardActionLabel("Saving workflow...");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update-workflow/${boardId}`,
        { method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: workflowNameInput }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not rename workflow");
      }

      setWorkflowName(data.name);
      setWorkflowNameInput(data.name);
      setIsEditingWorkflowName(false);
    } catch (error) {
      console.error("Workflow rename failed:", error);
      alert(error instanceof Error ? error.message : "Could not rename workflow");
    } finally {
      setIsSavingWorkflowName(false);
      setBoardActionLabel(null);
    }
  };

  const handleUpdateTransitionMode = async (nextLeftToRightOnly: boolean) => {
    try {
      setBoardActionLabel(
        nextLeftToRightOnly
          ? "Enabling left-to-right rules..."
          : "Allowing any-direction transitions..."
      );
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/transition-rules/${boardId}`,
        { method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ leftToRightOnly: nextLeftToRightOnly }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not update transition rules");
      }

      setLeftToRightOnly(Boolean(data.leftToRightOnly));
      setInvalidTransitions(data.invalidTransitions ?? []);
    } catch (error) {
      console.error("Transition mode update failed:", error);
      alert(error instanceof Error ? error.message : "Could not update transition rules");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleAddInvalidTransition = async () => {
    if (!invalidFromColumnId || !invalidToColumnId) {
      return;
    }

    try {
      setBoardActionLabel("Adding invalid transition...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/invalid-transition/${boardId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ fromColumnId: invalidFromColumnId, toColumnId: invalidToColumnId, }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not add invalid transition");
      }

      setInvalidTransitions((current) => [...current, data]);
    } catch (error) {
      console.error("Adding invalid transition failed:", error);
      alert(error instanceof Error ? error.message : "Could not add invalid transition");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleUpdateResolvedColumn = async () => {
    if (!boardId || !selectedResolvedColumnId) {
      return;
    }

    try {
      setBoardActionLabel("Saving resolved status...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/resolved-column/${boardId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ resolvedColumnId: selectedResolvedColumnId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not update resolved column");
      }

      setResolvedColumnId(data.resolvedColumnId ?? null);
      setShowResolvedColumnModal(false);
    } catch (error) {
      console.error("Resolved column update failed:", error);
      alert(error instanceof Error ? error.message : "Could not update resolved column");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleDeleteInvalidTransition = async (transitionId: string) => {
    try {
      setBoardActionLabel("Removing invalid transition...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/invalid-transition/${boardId}/${transitionId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not remove invalid transition");
      }

      setInvalidTransitions((current) =>
        current.filter((transition) => transition.id !== transitionId)
      );
    } catch (error) {
      console.error("Removing invalid transition failed:", error);
      alert(error instanceof Error ? error.message : "Could not remove invalid transition");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleMoveTask = async (
    taskId: string,
    sourceColId: string,
    targetColId: string
  ) => {
    if (sourceColId === targetColId || isBoardBusy) {
      return;
    }

    const targetColumn = displayColumns.find((column) => column.id === targetColId);
    if (
      targetColumn &&
      targetColumn.wipLimit > 0 &&
      targetColumn.tasks.length >= targetColumn.wipLimit
    ) {
      alert(`WIP Limit reached for ${targetColumn.title}! Move blocked.`);
      return;
    }

    const previousTasks = tasks;

    try {
      clearFeedbackTimeout();
      setMoveFeedback({
        tone: "loading",
        message: "Moving task, please wait...",
      });
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: targetColId,
              }
            : task
        )
      );
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update-task/${boardId}/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: targetColId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not move task");
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === data.id ? data : task))
      );
      void fetchBoardData();
      showTimedMoveFeedback({
        tone: "success",
        message: "Task moved successfully.",
      });
    } catch (error) {
      console.error("Task move failed:", error);
      setTasks(previousTasks);
      showTimedMoveFeedback(
        {
          tone: "error",
          message: error instanceof Error ? error.message : "Could not move task",
        },
        3000
      );
    }
  };

  const handleCreateTask = async (columnId: string, payload: CreateTaskPayload) => {
    try {
      setBoardActionLabel(payload.type === "STORY" ? "Creating story..." : "Creating task...");
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/add-task`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...payload,
            workflowId,
            status: columnId,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Task creation failed");
      }

      await fetchBoardData();
    } catch (error) {
      console.error("Task creation error:", error);
      alert(error instanceof Error ? error.message : "Task creation failed");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleEditTask = async (payload: UpdateTaskPayload) => {
    try {
      setBoardActionLabel("Saving changes...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update-task/${boardId}/${payload.taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Update failed");
      }

      await fetchBoardData();
    } catch (error) {
      console.error("Error updating task:", error);
      alert(error instanceof Error ? error.message : "Task update failed");
      throw error;
    } finally {
      setBoardActionLabel(null);
    }
  };

  const deleteTaskById = async (taskId: string) => {
    try {
      setBoardActionLabel("Deleting item...");
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete-task/${boardId}/${taskId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete item");
      }

      await fetchBoardData();
    } catch (error) {
      console.error("Task deletion error:", error);
      alert(error instanceof Error ? error.message : "Task deletion failed");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    await deleteTaskById(taskId);
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      setBoardActionLabel("Creating column...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/add-column/${boardId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: newColName,
            wipLimit: newColWip,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not create column");
      }

      setNewColName("");
      setNewColWip(0);
      setShowAddColumn(false);
      await fetchBoardData();
    } catch (error) {
      console.error("Failed to create column:", error);
      alert(error instanceof Error ? error.message : "Could not create column");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleUpdateColumn = async (
    columnId: string,
    payload:ColumnUpdatePayload
  ) => {
    try {
      setBoardActionLabel("Updating column...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update-column/${boardId}/${columnId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not update column");
      }

      await fetchBoardData();
    } catch (error) {
      console.error("Column update failed", error);
      alert(error instanceof Error ? error.message : "Could not update column");
      throw error;
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleRenameColumn = async (columnId: string, title: string) => {
    await handleUpdateColumn(columnId, { title });
  };

  const handleReorderColumn = async (
    columnId: string,
    direction: "left" |"right"
  ) => {
    const currentIndex = orderedColumns.findIndex((column) => column.id === columnId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === "left"? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= orderedColumns.length) {
      return;
    }

    const reorderedColumns = [...orderedColumns];
    const [movedColumn] = reorderedColumns.splice(currentIndex, 1);
    reorderedColumns.splice(targetIndex, 0, movedColumn);

    try {
      setBoardActionLabel("Reordering columns...");
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/reorder-columns/${boardId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            columnIds: reorderedColumns.map((column) => column.id),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not reorder columns");
      }

      await fetchBoardData();
    } catch (error) {
      console.error("Column reorder failed:", error);
      alert(error instanceof Error ? error.message : "Could not reorder columns");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!window.confirm("Delete this column?")) {
      return;
    }

    try {
      setBoardActionLabel("Deleting column...");
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete-column/${boardId}/${columnId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not delete column");
      }

      await fetchBoardData();

    } catch (error) {
      console.error("Column deletion failed", error);
      alert(error instanceof Error ? error.message : "Could not delete column");

    } finally {
      setBoardActionLabel(null);
    }
  };

  const boardSubtitle = useMemo(() => {
    if (viewerRole === "PROJECT_VIEWER") {
      return "Read-only board view";
    }

    if (isWorkflowAdmin) {
      return "Admin workflow controls enabled";
    }

    return "Task editing enabled";
  }, [isWorkflowAdmin, viewerRole]);

  if (loading) {
    return <div className={styles.loading}>Loading Board...</div>;
  }

  const openStoryPage = (storyId: string) => {
    if (!projectId || !workflowId) {
      return;
    }

    navigate(`/project/${projectId}/workflow/${workflowId}/task/${storyId}`);
  };

  const handleDeleteStory = async (
    event: React.MouseEvent,
    storyId: string
  ) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      "Do you want to delete the story ? All the tasks and bugs inside it will get deleted with the story."
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingStoryId(storyId);
      setBoardActionLabel("Deleting story...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete-task/${boardId}/${storyId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not delete story");
      }

      await fetchBoardData();
    } catch (error) {
      console.error("Story deletion failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete story");
    } finally {
      setDeletingStoryId(null);
      setBoardActionLabel(null);
    }
  };

  return (
    <div className={styles.boardWrapper}>
      <header className={styles.boardHeader}>
        <div>
          <div className={styles.titleRow}>
            {isEditingWorkflowName ? (
              <div className={styles.editWorkflowName}>
                <input
                  className={styles.workflowNameInput}
                  type="text"
                  value={workflowNameInput}
                  disabled={isSavingWorkflowName}
                  onChange={(e) => setWorkflowNameInput(e.target.value)}
                />
                <button
                  className={styles.workflowNameSaveBtn}
                  onClick={handleUpdateWorkflowName}
                  disabled={isSavingWorkflowName}
                >
                  {isSavingWorkflowName ? "Saving..." : "Save"}
                </button>
                <button
                  className={styles.workflowNameCancelBtn}
                  onClick={() => {
                    setWorkflowNameInput(workflowName);
                    setIsEditingWorkflowName(false);
                  }}
                  disabled={isSavingWorkflowName}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="maintitle">{workflowName.replace(/-/g, " ").toUpperCase()}</h1>
                {isWorkflowAdmin && (
                  <button
                    className={styles.editWorkflowBtn}
                    onClick={() => {
                      setWorkflowNameInput(workflowName);
                      setIsEditingWorkflowName(true);
                    }}
                    disabled={isBoardActionPending}
                    title="Edit workflow name"
                  >
                    ✎
                  </button>
                )}
              </>
            )}
          </div>
          <p className={styles.boardSubtitle}>{boardSubtitle}</p>
          {effectiveResolvedColumn && (
            <p className={styles.boardMetaNote}>
              Resolved At Column: {effectiveResolvedColumn.title}
            </p>
          )}
          {boardActionLabel && (
            <p className={styles.boardActionState}>{boardActionLabel}</p>
          )}
        </div>

        {isWorkflowAdmin && (
          <div className={styles.columnControls}>
            <button
              type="button"
              onClick={() => setShowTransitionRules((current) => !current)}
              className={styles.transitionPanelBtn}
              disabled={isBoardBusy}
            >
              {showTransitionRules ? "Close Transition Rules" : "Change Transition Rules"}
            </button>
            {!showAddColumn ? (
              <>
                <button
                  onClick={() => setShowAddColumn(true)}
                  className={styles.addColBtn}
                  disabled={isBoardBusy}
                >
                  + Add Column
                </button>
                <button
                  type="button"
                  onClick={openResolvedColumnModal}
                  className={styles.workflowSettingsBtn}
                  disabled={isBoardBusy}
                  title="Change resolved timestamp column"
                >
                  R
                </button>
              </>
            ) : (
              <form onSubmit={handleCreateColumn} className={styles.addColForm}>
                <input
                  type="text"
                  placeholder="Column Name"
                  value={newColName}
                  disabled={isBoardBusy}
                  onChange={(e) => setNewColName(e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="WIP Limit"
                  value={newColWip}
                  disabled={isBoardBusy}
                  onChange={(e) => setNewColWip(parseInt(e.target.value, 10) || 0)}
                  min="0"
                />
                <button type="submit" disabled={isBoardBusy}>
                  {isBoardActionPending ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  disabled={isBoardBusy}
                  onClick={() => setShowAddColumn(false)}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}
      </header>

      {isWorkflowAdmin && showTransitionRules && (
      <section className={styles.transitionPanel}>
        <div className={styles.transitionHeader}>
          <div className={styles.transitionHeaderLeft}>
            <h2 className={styles.transitionTitle}>Transition Rules</h2>
            {isWorkflowAdmin && (
              <div className={styles.transitionActionGroup}>
                <button
                  className={`${styles.transitionModeBtn} ${
                    leftToRightOnly ? styles.transitionModeBtnActive : ""
                  }`}
                  onClick={() => void handleUpdateTransitionMode(true)}
                  disabled={isBoardBusy || leftToRightOnly}
                >
                  Allow Left to Right Only
                </button>
                <button
                  className={`${styles.transitionModeBtn} ${
                    !leftToRightOnly ? styles.transitionModeBtnActive : ""
                  }`}
                  onClick={() => void handleUpdateTransitionMode(false)}
                  disabled={isBoardBusy || !leftToRightOnly}
                >
                  Set Invalid Status Transition
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className={styles.transitionInfoBtn}
            onClick={() => setShowTransitionInfo((current) => !current)}
            disabled={isBoardBusy}
            title="Show transition rule help"
          >
            i
          </button>
        </div>

        {showTransitionInfo && (
          <>
            <p className={styles.transitionSubtitle}>
              By default, all status transitions are valid unless this workflow restricts them.
            </p>
            {!leftToRightOnly && (
              <p className={styles.transitionModeNote}>
                Custom invalid transitions can be added below while all other moves remain valid.
              </p>
            )}
          </>
        )}

        {leftToRightOnly && (
          <p className={styles.transitionModeNote}>
            Only left to right transitions are valid in this workflow.
          </p>
        )}

        {!leftToRightOnly && (
          <>
            <div className={styles.transitionForm}>
              <select
                value={invalidFromColumnId}
                onChange={(event) => setInvalidFromColumnId(event.target.value)}
                disabled={isBoardBusy}
              >
                {orderedColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    From: {column.title}
                  </option>
                ))}
              </select>
              <select
                value={invalidToColumnId}
                onChange={(event) => setInvalidToColumnId(event.target.value)}
                disabled={isBoardBusy}
              >
                {orderedColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    To: {column.title}
                  </option>
                ))}
              </select>
              <button
                className={styles.addInvalidTransitionBtn}
                onClick={handleAddInvalidTransition}
                disabled={
                  isBoardBusy ||
                  !invalidFromColumnId ||
                  !invalidToColumnId ||
                  invalidFromColumnId === invalidToColumnId
                }
              >
                Add Invalid Transition
              </button>
            </div>

            <div className={styles.transitionList}>
              {invalidTransitionLabels.length === 0 ? (
                <p className={styles.transitionEmpty}>No custom invalid transitions added.</p>
              ) : (
                invalidTransitionLabels.map((transition) => (
                  <div key={transition.id} className={styles.transitionPill}>
                    <span>
                      {transition.fromTitle} {"->"} {transition.toTitle}
                    </span>
                    {isWorkflowAdmin && (
                      <button
                        className={styles.removeTransitionBtn}
                        onClick={() => void handleDeleteInvalidTransition(transition.id)}
                        disabled={isBoardBusy}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>
      )}

      <section className={styles.storySection}>
        <div className={styles.storySectionHeader}>
          <h2 className={styles.storyTitle}>Stories</h2>
          {canEditTasks && (
            <button
              className={styles.storyActionBtn}
              disabled={isBoardBusy}
              onClick={() => setIsStoryModalOpen(true)}
            >
              + Add Story
            </button>
          )}
        </div>

        <div className={styles.storyGrid}>
          {storyCards.length > 0 ? (
            storyCards.map((story) => (
              <button
                key={story.id}
                type="button"
                className={styles.storyCard}
                onClick={() => openStoryPage(story.id)}
              >
                <span className={styles.storyCardTitle}>{story.title}</span>
                <span className={styles.storyCardActions}>
                  <span className={styles.storyCardStatus}>{story.statusLabel}</span>
                  {story.canDelete && (
                    <button
                      type="button"
                      className={styles.storyDeleteBtn}
                      onClick={(event) => void handleDeleteStory(event, story.id)}
                      disabled={isBoardBusy || deletingStoryId === story.id}
                      title="Delete Story"
                      aria-label="Delete Story"
                    >
                      {deletingStoryId === story.id ? "..." : "×"}
                    </button>
                  )}
                </span>
              </button>
            ))
          ) : (
            <div className={styles.storyEmpty}>No stories yet. Create one to group tasks.</div>
          )}
        </div>
      </section>

      {moveFeedback && (
        <section
          className={`${styles.moveFeedbackBar} ${
            moveFeedback.tone === "loading"
              ? styles.moveFeedbackLoading
              : moveFeedback.tone === "success"
                ? styles.moveFeedbackSuccess
                : styles.moveFeedbackError
          }`}
        >
          <div className={styles.moveFeedbackContent}>
            {moveFeedback.tone === "loading" && (
              <span className={styles.moveFeedbackSpinner} aria-hidden="true" />
            )}
            <span>{moveFeedback.message}</span>
          </div>
        </section>
      )}

      <div className={styles.kanbanContainer}>
        {displayColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            allColumns={orderedColumns}
            boardId={boardId}
            userRole={viewerRole}
            currentUserId={currentUserId}
            isBoardBusy={isBoardBusy}
            members={boardMembers}
            stories={stories}
            onMoveTask={handleMoveTask}
            onUpdateTask={handleEditTask}
            onCreateTask={handleCreateTask}
            onRenameColumn={handleRenameColumn}
            onUpdateColumn={handleUpdateColumn}
            onReorderColumn={handleReorderColumn}
            onDeleteTask={(taskId) => handleDeleteTask(taskId)}
            onDeleteColumn={handleDeleteColumn}
          />
        ))}
      </div>

      {isStoryModalOpen && (
        <CreateTaskModal
          title="Create Story"
          allowedTypes={["STORY"]}
          defaultType="STORY"
          columnId={defaultStoryStatusId}
          boardId={boardId}
          members={boardMembers}
          onClose={() => setIsStoryModalOpen(false)}
          onAdd={async (payload) => {
            await handleCreateTask(defaultStoryStatusId, {
              ...payload,
              type: "STORY",
              parentStoryId: null,
            });
            setIsStoryModalOpen(false);
          }}
        />
      )}

      {isWorkflowAdmin && showResolvedColumnModal && (
        <div
          className={styles.settingsOverlay}
          onClick={() => setShowResolvedColumnModal(false)}
        >
          <div
            className={styles.settingsModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.settingsModalHeader}>
              <h2 className={styles.settingsTitle}>Resolved At Column</h2>
              <p className={styles.settingsSubtitle}>
                Choose which workflow status should set the resolved timestamp.
              </p>
            </div>

            <label className={styles.settingsField}>
              <span>Resolved when item reaches</span>
              <select
                value={selectedResolvedColumnId}
                onChange={(event) => setSelectedResolvedColumnId(event.target.value)}
                disabled={isBoardBusy}
              >
                {orderedColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </label>

            <p className={styles.settingsHint}>
              Default fallback stays <strong>Done</strong>, and if Done does not exist
              the last column will be used.
            </p>

            <div className={styles.settingsActions}>
              <button
                type="button"
                className={styles.settingsCancelBtn}
                onClick={() => setShowResolvedColumnModal(false)}
                disabled={isBoardBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.settingsSaveBtn}
                onClick={() => void handleUpdateResolvedColumn()}
                disabled={isBoardBusy || !selectedResolvedColumnId}
              >
                {isBoardActionPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowBoard;
