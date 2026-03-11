import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Profile.module.css";

interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string; // Support for display 
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_ORIGIN + "/api/auth/me",  {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // Include cookies for session management
          });

        if (response.ok) {
          const data = await response.json();
          console.log(data);
          setUser(data.user);
        } else {
          handleLogout();
        }
      } catch (error) {
        console.error("Profile Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
}); // Added missing dependency array to prevent infinite loop

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/user/avatar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser); // Update UI with new avatar URL 
        setShowAvatarMenu(false);
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  if (loading) return <div className={styles.loading}>Loading Profile...</div>;

  return (
    <div className={styles.profileContainer}>
      <main className={styles.card}>
        {/* Avatar Section with Hover Menu */}
        <div 
          className={styles.avatarWrapper} 
          onMouseEnter={() => setShowAvatarMenu(true)}
          onMouseLeave={() => setShowAvatarMenu(false)}
        >
          <div className={styles.avatarCircle}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className={styles.avatarImg} />
            ) : (
              user?.name.charAt(0).toUpperCase()
            )}
          </div>

          {showAvatarMenu && (
            <div className={styles.avatarOverlay}>
              <button onClick={triggerFileSelect}>Change Photo</button>
              <button className={styles.deleteBtn}>Delete Photo</button>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept="image/*"
          onChange={handleFileChange}
        />

        <div className={styles.infoSection}>
          <div className={styles.infoGroup}>
            <label className={styles.label}>User Name:</label>
            <p className={styles.valueBox}>{user?.name}</p>
          </div>
          <div className={styles.infoGroup}>
            <label className={styles.label}>Email Address:</label>
            <p className={styles.valueBox}>{user?.email}</p>
          </div>
        </div>

        <div className={styles.actionSection}>
          <button className={styles.editBtn}>Edit Profile</button>
        </div>
      </main>
    </div>
  );
};

export default Profile;