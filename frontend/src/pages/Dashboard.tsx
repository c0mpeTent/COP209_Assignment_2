import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectList from "../components/ProjectList"; // We'll create this next
import styles from "./Dashboard.module.css";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const Dashboard: React.FC = () => {
  // const navigate = useNavigate();
  // const [userName, setUserName] = useState("User");
  // const [projects, setProjects] = useState([]);
  // const [loading, setLoading] = useState(true);
  const [userName,setUserName] = useState("User");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,setLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState(""); // Track input value

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    // Simulation of project creation
    const newProject = {
      id: Date.now().toString(),
      name: newProjectName,
      description: "A new project management board", // Required metadata 
      createdAt: new Date().toISOString(), // Required timestamp
      updatedAt: new Date().toISOString(), // Required timestamp 
    };
    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // The assignment requires JWT tokens for authentication [cite: 73]
          "Authorization": `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify(newProject)
      });
  
      if (response.ok) {
        const savedProject = await response.json();
        // Add the real project (with DB-generated ID and timestamps) to state
        setProjects([...projects, savedProject]);
        setNewProjectName("");
      }
    } catch (error) {
      console.error("Failed to save project:", error);
    }
    
  };
  const handleDeleteProject = (projectId: string) => {
    // We use filter to keep every project EXCEPT the one with the matching ID
    setProjects((currentProjects) => 
      currentProjects.filter((project) => project.id !== projectId)
    );
  };
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [userRes, projRes] = await Promise.all([
          fetch(import.meta.env.VITE_API_URL + "/api/auth/me",  {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
            credentials: "include", // Include cookies for session management
          }),
          fetch(import.meta.env.VITE_API_URL + "/api/projects",  {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // Include cookies for session management
          })
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setUserName(userData.name);
        }

        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects(projData);
        }
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  });

  if (loading) return <div className={styles.loading}>Loading Workspace...</div>;

  return (
    /* We remove the Container and Nav because Layout.tsx handles them now */
    <div className={styles.dashboardContainer}>
      <nav className={styles.Hiuser}>
        <div className={styles.navActions}>
          <span>Hi, {userName}</span>
        </div>
      </nav>
      
      {/* <header className={styles.header}>
        <div className={styles.titleSection}>
    
          <p className={styles.subtitle}>Manage and track your active boards</p>
        </div>

        <button 
          className={styles.createBtn} 
          onClick={() => alert("Open Modal")}
        >
          <span className={styles.plusIcon}>+</span> New Project
        </button>
      </header> */}

      <header className={styles.headercp}>
        
        {/* New Input Group for Quick Creation */}
        <div className={styles.createGroup}>
          <input 
            type="text" 
            placeholder="Enter project name..." 
            className={styles.projectInput}
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <button 
            className={styles.createBtn} 
            onClick={handleCreateProject}
          >
            <span className={styles.plusIcon}>+</span> New Project
          </button>
        </div>
      </header>
  
      {/* The grid of projects */}
      <div className={styles.listSection}>
        <ProjectList items={projects} onDelete={handleDeleteProject} />
      </div>
  
    </div>
  );
};

export default Dashboard;
