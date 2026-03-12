import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Sidebar.module.css";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout =  async() => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include", // Include cookies for session management
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      // 3. Success! Handle the response
      console.log("Success:", data);
    navigate("/auth");
    window.location.reload(); 
  };

  // to check if a link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>P</div>
        <h2 className={styles.logoText}>Project<span style={{color: '#bb86fc'}}>Pro</span></h2>
      </div>

      <nav className={styles.navMenu}>
        <button 
          className={`${styles.navItem} ${isActive("/dashboard") ? styles.active : ""}`}
          onClick={() => navigate("/dashboard")}
        >
          <span className={styles.icon}>📊</span> Dashboard
        </button>

        <button 
          className={`${styles.navItem} ${isActive("/profile") ? styles.active : ""}`}
          onClick={() => navigate("/profile")}
        >
          <span className={styles.icon}>👤</span> Profile
        </button>

        <button 
          className={styles.navItem} 
          onClick={() => alert("Settings coming soon!")}
        >
          <span className={styles.icon}>⚙️</span> Settings
        </button>
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <span className={styles.icon}></span> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;