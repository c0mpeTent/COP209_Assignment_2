import React, { useMemo, useState } from "react";
import styles from "./Modal.module.css";
import type {
  BoardMemberOption,
  ColumnData,
  Task,
  UpdateTaskPayload,
} from "../../types/kanban";

interface EditTaskModalProps {
  task: Task;
  columns: ColumnData[];
  members: BoardMemberOption[];
  isReadOnly: boolean;
  lockStatus?: boolean;
  onClose: () => void;
  onUpdate: (payload: UpdateTaskPayload) => Promise<void>;
}

const formatDateForInput = (value?: string | null) => {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().split("T")[0];
};

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  columns,
  members,
  isReadOnly,
  lockStatus = false,
  onClose,
  onUpdate,
}) => {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    assignee: task.assignee?.email || "",
    dueDate: formatDateForInput(task.dueDate),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = useMemo(
    () => {
      const orderedColumns = columns.slice().sort((a, b) => a.order - b.order);
      const currentColumn = orderedColumns.find((column) => column.id === task.status);

      return orderedColumns
        .filter((column) =>
          task.type === "STORY" || !currentColumn ? true : column.order >= currentColumn.order
        )
        .map((column) => ({
          id: column.id,
          title: column.title,
        }));
    },
    [columns, task.status, task.type]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    const payload: UpdateTaskPayload = {
      taskId: task.id,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignee: formData.assignee || "",
      dueDate: formData.dueDate || null,
    };

    try {
      setIsSubmitting(true);
      await onUpdate(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => !isSubmitting && onClose()}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeaderRow}>
          <div>
            <h2>{isReadOnly ? "Task Details" : "Edit Task"}</h2>
            <p className={styles.taskMeta}>
              {task.type} · Created {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.field}>
            <label>Title</label>
            <input
              value={formData.title}
              disabled={isReadOnly || isSubmitting}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea
              rows={5}
              value={formData.description}
              disabled={isReadOnly || isSubmitting}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Status</label>
              <select
                value={formData.status}
                disabled={isReadOnly || lockStatus || isSubmitting}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {statusOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Priority</label>
              <select
                value={formData.priority}
                disabled={isReadOnly || isSubmitting}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as Task["priority"],
                  })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Assignee</label>
              <select
                value={formData.assignee}
                disabled={isReadOnly || isSubmitting}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.email}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                disabled={isReadOnly || isSubmitting}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>Task ID</span>
              <strong>{task.id}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Updated</span>
              <strong>{new Date(task.updatedAt).toLocaleString()}</strong>
            </div>
            {task.reporter && (
              <div className={styles.infoItem}>
                <span>Created By</span>
                <strong>{task.reporter.name}</strong>
              </div>
            )}
            <div className={styles.infoItem}>
              <span>Current Status</span>
              <strong>
                {statusOptions.find((option) => option.id === task.status)?.title || "Unknown"}
              </strong>
            </div>
          </div>

          <footer className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={isSubmitting}
            >
              {isReadOnly ? "Close" : "Cancel"}
            </button>
            {!isReadOnly && (
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
