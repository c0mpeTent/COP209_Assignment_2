import React, { useState } from "react";
import styles from "./Modal.module.css"; // Reuse your Modal styles
import type { Task, UpdateTaskPayload } from "../../types/kanban";

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (payload: UpdateTaskPayload) => Promise<void>;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee,
    dueDate: task.dueDate || "",
  });
  const [newComment, setNewComment] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateTaskPayload = {
      taskId: task.id,
      title: formData.name,
      description: formData.description || "", // Convert undefined to empty string
      status: formData.status,
      priority: formData.priority,
      assignee: formData.assignee || "",     // Convert undefined to empty string
      dueDate: formData.dueDate,
      newComment: newComment.trim() || undefined,
    };

    await onUpdate(payload);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Edit Issue: {task.id}</h2>
        <form onSubmit={handleSave} className={styles.form}>
          {/* Reuse existing input styles for Name, Description, Assignee, Priority, DueDate */}
          <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          
          <div className={styles.field}>
            <label>Add Comment</label>
            <textarea 
              placeholder="Write a comment..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
          </div>

          <div className={styles.commentSection}>
             <h3>Activity / Comments</h3>
             {task.comments?.map(c => (
               <div key={c.id} className={styles.comment}>
                 <strong>{c.authorName}</strong>: {c.text}
               </div>
             ))}
          </div>

          <footer className={styles.modalActions}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn}>Save Changes</button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;