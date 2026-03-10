import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectList from "../components/ProjectList"; // We'll create this next
import styles from "./Dashboard.module.css";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/auth");
          return;
        }

        const [userRes, projRes] = await Promise.all([
          fetch("http://localhost:5000/api/auth/me", {
            headers: { "Authorization": `Bearer ${token}` }
          }),
          fetch("http://localhost:5000/api/projects", {
            headers: { "Authorization": `Bearer ${token}` }
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
  }, [navigate]);

  if (loading) return <div className={styles.loading}>Loading Workspace...</div>;

  return (
    /* We remove the Container and Nav because Layout.tsx handles them now */
    <div className={styles.dashboardContent}>
      <nav>
        <div className={styles.navActions}>
          <span>Hi, {userName}</span>
        </div>
      </nav>
      
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Your Projects</h1>
          <p className={styles.subtitle}>Manage and track your active boards</p>
        </div>
  
        {/* This button is the "Primary Action" for this specific page */}
        <button 
          className={styles.createBtn} 
          onClick={() => alert("Open Modal")}
        >
          <span className={styles.plusIcon}>+</span> New Project
        </button>
      </header>
  
      {/* The grid of projects */}
      <div className={styles.listSection}>
        <ProjectList items={projects} />
      </div>
  
    </div>
  );
};

export default Dashboard;
