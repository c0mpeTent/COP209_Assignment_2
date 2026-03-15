import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import KanbanColumn from "../components/kanban/KhanbanColumn";
import CreateTaskModal from "../components/kanban/CreateTaskModal";
import EditTaskModal from "../components/kanban/EditTaskModal";
import type {
  BoardFetchResponse,
  BoardMemberOption,
  ColumnData,
  ColumnUpdatePayload,
  CreateTaskPayload,
  ProjectRole,
  Task,
  UpdateTaskPayload,
} from "../types/kanban";
import styles from "./WorkflowBoard.module.css";

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
  const [workflowName, setWorkflowName] = useState("Workflow");
  const [boardId, setBoardId] = useState("");
  const [boardMembers, setBoardMembers] = useState<BoardMemberOption[]>([]);
  const [newColName, setNewColName] = useState("");
  const [newColWip, setNewColWip] = useState(0);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [isEditingWorkflowName, setIsEditingWorkflowName] = useState(false);
  const [workflowNameInput, setWorkflowNameInput] = useState("");
  const [isSavingWorkflowName, setIsSavingWorkflowName] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Task | null>(null);
  const [boardActionLabel, setBoardActionLabel] = useState<string | null>(null);

  const isWorkflowAdmin =
    viewerRole === "PROJECT_ADMIN" || viewerRole === "GLOBAL_ADMIN";
  const canEditTasks = viewerRole !== "PROJECT_VIEWER";
  const isBoardActionPending = Boolean(boardActionLabel);

  const fetchBoardData = useCallback(async () => {
    if (!workflowId || !projectId) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/get-workflow/${projectId}/${workflowId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Could not load workflow");
      }

      const data: BoardFetchResponse = await response.json();

      setViewerRole(data.userRole || "PROJECT_VIEWER");
      setBoardId(data.id);
      setWorkflowName(data.name);
      setWorkflowNameInput(data.name);
      setBoardMembers(data.members ?? []);
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
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, workflowId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  const orderedColumns = useMemo(
    () => columns.slice().sort((a, b) => a.order - b.order),
    [columns]
  );

  const stories = useMemo(
    () =>
      tasks
        .filter((task) => task.type === "STORY")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [tasks]
  );

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) ?? null,
    [selectedStoryId, stories]
  );

  useEffect(() => {
    if (selectedStoryId && !selectedStory) {
      setSelectedStoryId(null);
    }
  }, [selectedStory, selectedStoryId]);

  const visibleWorkItems = useMemo(
    () =>
      tasks.filter((task) => {
        if (task.type === "STORY") {
          return false;
        }

        if (selectedStoryId) {
          return task.parentStoryId === selectedStoryId;
        }

        return !task.parentStoryId;
      }),
    [selectedStoryId, tasks]
  );

  const displayColumns = useMemo(
    () =>
      orderedColumns.map((column) => ({
        ...column,
        tasks: visibleWorkItems.filter((task) => task.status === column.id),
      })),
    [orderedColumns, visibleWorkItems]
  );

  const selectedStoryTaskCount = useMemo(
    () => tasks.filter((task) => task.parentStoryId === selectedStoryId).length,
    [selectedStoryId, tasks]
  );

  const selectedStoryStatusLabel = useMemo(() => {
    if (!selectedStory) {
      return "";
    }

    return (
      orderedColumns.find((column) => column.id === selectedStory.status)?.title ??
      "Unknown"
    );
  }, [orderedColumns, selectedStory]);

  const selectedStoryPriorityClass = useMemo(() => {
    if (!selectedStory) {
      return "";
    }

    switch (selectedStory.priority) {
      case "CRITICAL":
        return styles.storyPriorityCritical;
      case "HIGH":
        return styles.storyPriorityHigh;
      case "MEDIUM":
        return styles.storyPriorityMedium;
      case "LOW":
        return styles.storyPriorityLow;
      default:
        return "";
    }
  }, [selectedStory]);

  const selectedStoryDueDateLabel = useMemo(() => {
    if (!selectedStory?.dueDate) {
      return "No due date";
    }

    const dueDate = new Date(selectedStory.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return "No due date";
    }

    return dueDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [selectedStory]);

  const defaultStoryStatusId = orderedColumns[0]?.id ?? "";

  const handleUpdateWorkflowName = async () => {
    if (!boardId || !workflowNameInput.trim()) {
      return;
    }

    try {
      setIsSavingWorkflowName(true);
      setBoardActionLabel("Saving workflow...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update-workflow/${boardId}`,
        {
          method: "PATCH",
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

  const handleMoveTask = async (
    taskId: string,
    sourceColId: string,
    targetColId: string
  ) => {
    if (sourceColId === targetColId) {
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

    try {
      setBoardActionLabel("Moving task...");
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

      await fetchBoardData();
    } catch (error) {
      console.error("Task move failed:", error);
      alert(error instanceof Error ? error.message : "Could not move task");
    } finally {
      setBoardActionLabel(null);
    }
  };

  const handleCreateTask = async (columnId: string, payload: CreateTaskPayload) => {
    try {
      setBoardActionLabel(payload.type === "STORY" ? "Creating story..." : "Creating task...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/add-task`,
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
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete-task/${boardId}/${taskId}`,
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
    payload: ColumnUpdatePayload
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
    direction: "left" | "right"
  ) => {
    const currentIndex = orderedColumns.findIndex((column) => column.id === columnId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= orderedColumns.length) {
      return;
    }

    const reorderedColumns = [...orderedColumns];
    const [movedColumn] = reorderedColumns.splice(currentIndex, 1);
    reorderedColumns.splice(targetIndex, 0, movedColumn);

    try {
      setBoardActionLabel("Reordering columns...");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/reorder-columns/${boardId}`,
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
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete-column/${boardId}/${columnId}`,
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

  const handleDeleteStory = async (story: Task) => {
    if (
      !window.confirm(
        `Delete story "${story.title}"? This will also remove its child tasks and bugs.`
      )
    ) {
      return;
    }

    await deleteTaskById(story.id);
    setSelectedStoryId(null);
  };

  const boardSubtitle = useMemo(() => {
    if (selectedStory) {
      return `Viewing tasks and bugs inside "${selectedStory.title}"`;
    }

    if (viewerRole === "PROJECT_VIEWER") {
      return "Read-only board view";
    }

    if (isWorkflowAdmin) {
      return "Admin workflow controls enabled";
    }

    return "Task editing enabled";
  }, [isWorkflowAdmin, selectedStory, viewerRole]);

  if (loading) {
    return <div className={styles.loading}>Loading Board...</div>;
  }

  const openSelectedStoryPage = () => {
    if (!projectId || !workflowId || !selectedStory) {
      return;
    }

    navigate(`/project/${projectId}/workflow/${workflowId}/task/${selectedStory.id}`);
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
                <h1>{workflowName.replace(/-/g, " ").toUpperCase()}</h1>
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
          {boardActionLabel && (
            <p className={styles.boardActionState}>{boardActionLabel}</p>
          )}
        </div>

        {isWorkflowAdmin && (
          <div className={styles.columnControls}>
            {!showAddColumn ? (
              <button
                onClick={() => setShowAddColumn(true)}
                className={styles.addColBtn}
                disabled={isBoardActionPending}
              >
                + Add Column
              </button>
            ) : (
              <form onSubmit={handleCreateColumn} className={styles.addColForm}>
                <input
                  type="text"
                  placeholder="Column Name"
                  value={newColName}
                  disabled={isBoardActionPending}
                  onChange={(e) => setNewColName(e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="WIP Limit"
                  value={newColWip}
                  disabled={isBoardActionPending}
                  onChange={(e) => setNewColWip(parseInt(e.target.value, 10) || 0)}
                  min="0"
                />
                <button type="submit" disabled={isBoardActionPending}>
                  {isBoardActionPending ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  disabled={isBoardActionPending}
                  onClick={() => setShowAddColumn(false)}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}
      </header>

      <section className={styles.storySection}>
        <div className={styles.storySectionHeader}>
          <h2 className={styles.storyTitle}>Stories</h2>
          {canEditTasks && (
            selectedStory ? (
              <button
                className={styles.storyActionBtn}
                disabled={isBoardActionPending}
                onClick={() => setSelectedStoryId(null)}
              >
                Close Story
              </button>
            ) : (
              <button
                className={styles.storyActionBtn}
                disabled={isBoardActionPending}
                onClick={() => setIsStoryModalOpen(true)}
              >
                + Add Story
              </button>
            )
          )}
        </div>

        <div className={styles.storyGrid}>
          {stories.length > 0 ? (
            stories.map((story) => (
              <button
                key={story.id}
                className={`${styles.storyCard} ${
                  selectedStoryId === story.id ? styles.storyCardActive : ""
                }`}
                onClick={() => setSelectedStoryId(story.id)}
              >
                {story.title}
              </button>
            ))
          ) : (
            <div className={styles.storyEmpty}>No stories yet. Create one to group tasks.</div>
          )}
        </div>
      </section>

      {selectedStory && (
        <section
          className={`${styles.storyDetailsBox} ${selectedStoryPriorityClass}`}
          role="button"
          tabIndex={0}
          onClick={openSelectedStoryPage}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openSelectedStoryPage();
            }
          }}
        >
          <div className={styles.storyDetailsTop}>
            <div>
              <h3 className={styles.storyDetailsTitle}>{selectedStory.title}</h3>
              <p className={styles.storyDetailsText}>
                {selectedStory.description || "No story description provided."}
              </p>
            </div>
            <div className={styles.storyStatusBadge}>{selectedStoryStatusLabel}</div>
          </div>

          <div className={styles.storyMetaRow}>
            <div className={styles.storyMetaGroup}>
              <span className={styles.storyMetaLabel}>Created By</span>
              <strong>{selectedStory.reporter?.name || "Unknown"}</strong>
            </div>
            <div className={styles.storyMetaGroup}>
              <span className={styles.storyMetaLabel}>Assigned To</span>
              <strong>{selectedStory.assignee?.name || "Unassigned"}</strong>
            </div>
            <div className={styles.storyMetaGroup}>
              <span className={styles.storyMetaLabel}>Tasks/Bugs</span>
              <strong>{selectedStoryTaskCount}</strong>
            </div>
          </div>

          <div className={styles.storyDetailsActions}>
            <div className={styles.storyDueDate}>
              <span className={styles.storyDueDateLabel}>Due Date</span>
              <strong>{selectedStoryDueDateLabel}</strong>
            </div>
            {canEditTasks && (
              <div className={styles.storyActionButtons}>
                <button
                  className={styles.editStoryBtn}
                  disabled={isBoardActionPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingStory(selectedStory);
                  }}
                >
                  Edit Story Details
                </button>
                <button
                  className={styles.deleteStoryBtn}
                  disabled={isBoardActionPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDeleteStory(selectedStory);
                  }}
                >
                  Delete Story
                </button>
              </div>
            )}
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
            members={boardMembers}
            activeStoryId={selectedStoryId}
            onMoveTask={handleMoveTask}
            onUpdateTask={handleEditTask}
            onCreateTask={handleCreateTask}
            onDeleteTask={(taskId) => handleDeleteTask(taskId)}
            onRenameColumn={handleRenameColumn}
            onUpdateColumn={handleUpdateColumn}
            onReorderColumn={handleReorderColumn}
            onDeleteColumn={handleDeleteColumn}
          />
        ))}
      </div>

      {isStoryModalOpen && (
        <CreateTaskModal
          columnId={defaultStoryStatusId}
          boardId={boardId}
          members={boardMembers}
          title="Create Story"
          allowedTypes={["STORY"]}
          defaultType="STORY"
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

      {editingStory && (
        <EditTaskModal
          task={editingStory}
          columns={orderedColumns}
          members={boardMembers}
          isReadOnly={viewerRole === "PROJECT_VIEWER"}
          lockStatus
          onClose={() => setEditingStory(null)}
          onUpdate={async (payload) => {
            await handleEditTask(payload);
            setEditingStory(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkflowBoard;
