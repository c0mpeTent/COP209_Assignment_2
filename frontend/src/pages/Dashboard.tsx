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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  if (loading) return <div className={styles.loading}>Loading Workspace...</div>;

  return (
    <div className={styles.dashboardContainer}>
      <nav className={styles.navbar}>
        <h2>Project<span style={{ color: "#bb86fc" }}>Pro</span></h2>
        <div className={styles.navActions}>
          <span>Hi, {userName}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <main className={styles.content}>
        <header className={styles.header}>
          <h1>Dashboard</h1>
          {/* Create Button stays here as the "Primary Action" */}
          <button className={styles.createBtn} onClick={() => alert("Open Modal")}>
            + New Project
          </button>
        </header>

        {/* Pass the projects array into our new component via 'props' */}
        <ProjectList items={projects} />
      </main>
    </div>
  );
};

export default Dashboard;