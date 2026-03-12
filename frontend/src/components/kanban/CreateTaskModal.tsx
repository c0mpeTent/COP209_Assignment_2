import React, { useState } from "react";
import styles from "./Modal.module.css";
import type {CreateTaskPayload} from "../../types/kanban";
type TaskType = "Story" | "Task" | "Bug";
type PriorityType = "Low" | "Medium" | "High" | "Critical";

interface CreateTaskModalProps {
  columnId: string;
  onClose: () => void;
  // onAdd handles the API submission in the parent component
  onAdd: (payload: CreateTaskPayload) => void; 
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ columnId, onClose, onAdd }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("Task");
  const [priority, setPriority] = useState<PriorityType>("Medium");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      title,
      description,
      type,
      priority,
      status: columnId, // The task starts in the column where 'Create' was clicked
      dueDate: dueDate || null,
      createdAt: new Date().toISOString(), // Mandatory [cite: 151]
    };

    onAdd(payload);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h2>Create Issue</h2>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Issue Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as TaskType)}>
              <option value="Task">Task</option>
              <option value="Story">Story</option>
              <option value="Bug">Bug</option>
            </select>
          </div>

          <div className={styles.field}>
            <label>Title <span className={styles.required}></span></label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
              placeholder="What needs to be done?"
            />
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={5}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as PriorityType)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Due Date</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
              />
            </div>
          </div>

          <footer className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.submitBtn}>Create</button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;