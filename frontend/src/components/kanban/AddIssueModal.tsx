import React, { useState } from "react";
import styles from "./Modal.module.css";

type TaskType = "Story" | "Task" | "Bug"; // [cite: 118]
type PriorityType = "Low" | "Medium" | "High" | "Critical"; // [cite: 128]

interface IssuePayload {
  title: string;
  type: TaskType;
  priority: PriorityType;
  createdAt: string; // Mandatory timestamp [cite: 151]
}

interface AddIssueProps {
  onClose: () => void;
  onAdd: (issue: IssuePayload) => void; // Fixed: replaced 'any' [cite: 183]
}

const AddIssueModal: React.FC<AddIssueProps> = ({ onClose, onAdd }) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("Task"); 
  const [priority, setPriority] = useState<PriorityType>("Medium"); // Added type safety

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Constructing the payload exactly as defined in the interface
    const newIssue: IssuePayload = {
      title,
      type,
      priority,
      createdAt: new Date().toISOString() // [cite: 151]
    };
    
    onAdd(newIssue);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Create New Issue</h2>
        <form onSubmit={handleSubmit}>
          <label>Title</label>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />

          <label>Issue Type</label> 
          <select 
            value={type} 
            onChange={e => setType(e.target.value as TaskType)} // Type assertion over 'any'
          >
            <option value="Story">Story</option>
            <option value="Task">Task</option>
            <option value="Bug">Bug</option>
          </select>

          <label>Priority</label>
          <select 
            value={priority} 
            onChange={e => setPriority(e.target.value as PriorityType)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          <div className={styles.btnGroup}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIssueModal;