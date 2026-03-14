import React, { useState } from "react";
import styles from "./Modal.module.css";
//import { useParams } from "react-router-dom";
import type {CreateTaskPayload, TaskType, PriorityType} from "../../types/kanban";

interface CreateTaskModalProps {
  columnId: string;
  boardId: string;
  onClose: () => void;
  // onAdd handles the API submission in the parent component
  onAdd: (payload: CreateTaskPayload) => void; 
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ columnId, boardId, onClose, onAdd }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("TASK");
  const [priority, setPriority] = useState<PriorityType>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState(""); // Add assignee state  //

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicitly type the payload to catch missing properties
    const payload: CreateTaskPayload = {
      workflowId:  boardId || "", // Or however you identify the board ID
      title: title,                   // map title state to 'name'
      description,
      type,
      priority,
      status: columnId,
      dueDate: dueDate || null,
      parentStoryId: null,           // map to parentStoryId
      assignee, 
      createdAt: new Date().toISOString() // FIX: Added to resolve ts(2739)
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
          {/* Moved Assignee here: Full width below Description */}
          <div className={styles.field}>
            <label>Assignee</label>
            <input 
              type="text" 
              value={assignee} 
              onChange={(e) => setAssignee(e.target.value)} 
              placeholder="User ID or Email"
              required
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