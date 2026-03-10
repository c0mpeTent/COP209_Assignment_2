import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Profile.module.css";

interface UserProfile {
  name: string;
  email: string;
  
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/auth");
          return;
        }

        const response = await fetch("http://localhost:5000/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          // If the token is invalid or expired
          handleLogout();
        }
      } catch (error) {
        console.error("Profile Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
    window.location.reload(); // Ensures all states are cleared
  };

  if (loading) return <div className={styles.loading}>Loading Profile...</div>;

  return (
    <div className={styles.profileContainer}>
      <nav className={styles.navbar}>
        <button onClick={() => navigate("/dashboard")} className={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </nav>

      <main className={styles.card}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarPlaceholder}>
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <h1 className={styles.userName}>{user?.name}</h1>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoGroup}>
            <label>Email Address</label>
            <p>{user?.email}</p>
          </div>
        </div>

        <div className={styles.actionSection}>
          <button className={styles.editBtn}>Edit Profile</button>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
};

export default Profile;