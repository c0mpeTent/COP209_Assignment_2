// import React, { useEffect, useState } from "react";
import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
import ProjectList from "../components/ProjectList"; // We'll create this next
import styles from "./Dashboard.module.css";

const Dashboard: React.FC = () => {
  // const navigate = useNavigate();
  // const [userName, setUserName] = useState("User");
  // const [projects, setProjects] = useState([]);
  // const [loading, setLoading] = useState(true);
  const [userName] = useState("User");
  const [projects, setProjects] = useState([{id:"",name:"",description:""}]);
  const [loading] = useState(false);
  const [newProjectName, setNewProjectName] = useState(""); // Track input value

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    // Simulation of project creation
    const newProject = {
      id: Date.now().toString(),
      name: newProjectName,
      description: "A new project management board", // Required metadata 
      // createdAt: new Date().toISOString(), // Required timestamp 
    };

    setProjects([...projects, newProject]);
    setNewProjectName(""); // Clear input after creation
  };
  // useEffect(() => {
  //   const fetchDashboardData = async () => {
  //     try {
  //      const token = "you are stupid ";

  //       const [userRes, projRes] = await Promise.all([
  //         fetch("http://localhost:5000/api/auth/me", {
  //           headers: { "Authorization": `Bearer ${token}` }
  //         }),
  //         fetch("http://localhost:5000/api/projects", {
  //           headers: { "Authorization": `Bearer ${token}` }
  //         })
  //       ]);

  //       if (userRes.ok) {
  //         const userData = await userRes.json();
  //         setUserName(userData.name);
  //       }

  //       if (projRes.ok) {
  //         const projData = await projRes.json();
  //         setProjects(projData);
  //       }
  //     } catch (error) {
  //       console.error("Dashboard Load Error:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchDashboardData();
  // }, [navigate]);

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
        <ProjectList items={projects} />
      </div>
  
    </div>
  );
};

export default Dashboard;
