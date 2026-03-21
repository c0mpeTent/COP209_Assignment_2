import React, { useState } from "react";
import styles from "./Modal.module.css";
import type {
  BoardMemberOption,
  CreateTaskPayload,
  PriorityType,
  Task,
  TaskType,
} from "../../types/kanban";

interface CreateTaskModalProps {
  columnId: string;
  boardId: string;
  members: BoardMemberOption[];
  stories?: Task[];
  title?: string;
  allowedTypes?: TaskType[];
  defaultType?: TaskType;
  fixedParentStoryId?: string | null;
  onClose: () => void;
  onAdd: (payload: CreateTaskPayload) => Promise<void> | void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  columnId,
  boardId,
  members,
  stories = [],
  title: modalTitle = "Create Issue",
  allowedTypes = ["TASK", "BUG", "STORY"],
  defaultType = "TASK",
  fixedParentStoryId = null,
  onClose,
  onAdd,
}) => {
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>(defaultType);
  const [priority, setPriority] = useState<PriorityType>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [parentStoryId, setParentStoryId] = useState(fixedParentStoryId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    const payload: CreateTaskPayload = {
      workflowId: boardId || "",
      title: taskTitle,
      description,
      type,
      priority,
      status: columnId,
      dueDate: dueDate || null,
      parentStoryId:
        type === "STORY"
          ? null
          : fixedParentStoryId ?? (parentStoryId ? parentStoryId : null),
      assignee: assignee || undefined,
    };

    try {
      setIsSubmitting(true);
      await onAdd(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => !isSubmitting && onClose()}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h2>{modalTitle}</h2>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Issue Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              disabled={allowedTypes.length === 1 || isSubmitting}
            >
              {allowedTypes.includes("TASK") && <option value="TASK">Task</option>}
              {allowedTypes.includes("STORY") && <option value="STORY">Story</option>}
              {allowedTypes.includes("BUG") && <option value="BUG">Bug</option>}
            </select>
          </div>

          <div className={styles.field}>
            <label>Title</label>
            <input
              type="text"
              value={taskTitle}
              disabled={isSubmitting}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
              placeholder="What needs to be done?"
            />
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea
              value={description}
              disabled={isSubmitting}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          <div className={styles.field}>
            <label>Assignee</label>
            <select
              value={assignee}
              disabled={isSubmitting}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.email}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>

          {type !== "STORY" && !fixedParentStoryId && stories.length > 0 && (
            <div className={styles.field}>
              <label>Story</label>
              <select
                value={parentStoryId}
                disabled={isSubmitting}
                onChange={(e) => setParentStoryId(e.target.value)}
              >
                <option value="">No Story</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Priority</label>
              <select
                value={priority}
                disabled={isSubmitting}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                disabled={isSubmitting}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <footer className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
