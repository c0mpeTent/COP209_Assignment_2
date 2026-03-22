import React, { useMemo, useState } from "react";
import TaskCard from "./TaskCard";
import ColumnHeader from "./ColumnHeader";
import styles from "./Kanban.module.css";
import CreateTaskModal from "./CreateTaskModal";
import type { ColumnProps, CreateTaskPayload } from "../../types/kanban";

const KanbanColumn: React.FC<ColumnProps> = ({
  column,
  allColumns,
  userRole,
  currentUserId,
  isBoardBusy = false,
  boardId,
  members,
  stories,
  onMoveTask,
  onCreateTask,
  onDeleteTask,
  onRenameColumn,
  onUpdateColumn,
  onReorderColumn,
  onDeleteColumn,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAdmin = userRole === "PROJECT_ADMIN" || userRole === "GLOBAL_ADMIN";
  const canCreate = userRole !== "PROJECT_VIEWER" && !isBoardBusy;
  const columnIndex = useMemo(
    () => allColumns.findIndex((currentColumn) => currentColumn.id === column.id),
    [allColumns, column.id]
  );
  const canMoveLeft = columnIndex > 0;
  const canMoveRight = columnIndex < allColumns.length - 1;

  const handleCreateTaskInternal = async (issuePayload: CreateTaskPayload) => {
    if (column.wipLimit > 0 && column.tasks.length >= column.wipLimit) {
      alert("Cannot create task: Column WIP limit reached.");
      return;
    }

    try {
      await onCreateTask(column.id, issuePayload);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Task creation failed", error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (userRole === "PROJECT_VIEWER" || isBoardBusy) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (userRole === "PROJECT_VIEWER" || isBoardBusy) { return; }

    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const sourceColId = e.dataTransfer.getData("sourceColId");

    if (
      column.wipLimit > 0 &&
      column.tasks.length >= column.wipLimit &&
      sourceColId !== column.id
    ) {
      alert(`WIP Limit reached for ${column.title}.`);
      return;
    }

    if (sourceColId !== column.id) {
      await onMoveTask(taskId, sourceColId, column.id);
    }
  };

  const handleRenameColumn = async () => {
    const newTitle = prompt("Enter a new column name:", column.title);
    if (!newTitle || newTitle.trim() === column.title) {
      return;
    }
    await onRenameColumn(column.id, newTitle.trim());

    setShowMenu(false);
  };

  const handleUpdateWip = async () => {
    const newLimit = prompt("Enter new WIP limit:", column.wipLimit.toString());
    if (newLimit === null) {
      return;
    }

    const parsedLimit = parseInt(newLimit, 10);
    if (Number.isNaN(parsedLimit) || parsedLimit < 0) {
      alert("Please enter a valid WIP limit.");
      return;
    }

    await onUpdateColumn(column.id, { wipLimit: parsedLimit });
    setShowMenu(false);
  };

  return (
    <div className={styles.column} onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className={styles.headerWrapper}>
        <ColumnHeader
          title={column.title}
          currentCount={column.tasks.length}
          limit={column.wipLimit}
        />

        {isAdmin && (
          <div className={styles.menuContainer}>
            <button
              className={styles.dotsBtn}
              disabled={isBoardBusy}
              onClick={() => setShowMenu((current) => !current)}
            >
              ⋮
            </button>
            {showMenu && (
              <div
                className={styles.dropdown}
                onMouseLeave={() => setShowMenu(false)}
              >
                <button onClick={handleRenameColumn}>Rename Column</button>
                <button onClick={handleUpdateWip}>Change WIP Limit</button>
                <button
                  disabled={!canMoveLeft}
                  onClick={() => onReorderColumn(column.id, "left")}
                >
                  Move Left
                </button>
                <button
                  disabled={!canMoveRight}
                  onClick={() => onReorderColumn(column.id, "right")}
                >
                  Move Right
                </button>
                <button
                  className={styles.deleteOption}
                  onClick={() => onDeleteColumn(column.id)}
                >
                  Delete Column
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.taskList}>
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            currentUserId={currentUserId}
            isBoardBusy={isBoardBusy}
            columnId={column.id}
            storyTitle={
              task.parentStoryId
                ? stories.find((story) => story.id === task.parentStoryId)?.title
                : undefined
            }
            userRole={userRole}
            onDelete={() => onDeleteTask(task.id, column.id)}
          />
        ))}
      </div>

      {canCreate && (
        <button
          className={styles.addCardBtn}
          disabled={isBoardBusy}
          onClick={() => setIsModalOpen(true)}
        >
          <span className={styles.plus}>+</span> Create Task
        </button>
      )}

      {isModalOpen && (
        <CreateTaskModal
          columnId={column.id}
          boardId={boardId}
          members={members}
          title="Create Issue"
          allowedTypes={["TASK", "BUG"]}
          defaultType="TASK"
          stories={stories}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleCreateTaskInternal}
        />
      )}
    </div>
  );
};

export default KanbanColumn;
