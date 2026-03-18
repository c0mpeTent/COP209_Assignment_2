import React, { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Profile.module.css";

interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string; // Support for display 
}

interface ProfileFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const getResolvedAvatarUrl = (avatarUrl?: string) => {
  if (!avatarUrl) return "";

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    if (avatarUrl.includes("undefined/uploads/")) {
      return avatarUrl.replace(
        "undefined/uploads/",
        `${import.meta.env.VITE_BACKEND_ORIGIN}/uploads/`,
      );
    }

    return avatarUrl;
  }

  if (avatarUrl.startsWith("undefined/uploads/")) {
    return avatarUrl.replace(
      "undefined/uploads/",
      `${import.meta.env.VITE_BACKEND_ORIGIN}/uploads/`,
    );
  }

  if (avatarUrl.startsWith("/uploads/")) {
    return `${import.meta.env.VITE_BACKEND_ORIGIN}${avatarUrl}`;
  }

  if (avatarUrl.startsWith("uploads/")) {
    return `${import.meta.env.VITE_BACKEND_ORIGIN}/${avatarUrl}`;
  }

  return avatarUrl;
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formState, setFormState] = useState<ProfileFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    navigate("/auth");
  }, [navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_ORIGIN + "/api/auth/me",  {
            method: "GET",
            credentials: "include", // include cookies for session management
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
    void fetchProfile();
  }, [handleLogout]);

  const openEditModal = () => {
    setFormState({
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      confirmPassword: "",
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setFormError("");
    setIsEditModalOpen(false);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);
    console.log(formData);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/profile/update-avatar`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user); // Update UI with new avatar URL 
        setShowAvatarMenu(false);
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const deleteAvatar = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/profile/delete-avatar`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user); // Update UI with no avatar
        setShowAvatarMenu(false);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.name.trim() || !formState.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }

    if (formState.password && formState.password !== formState.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");

      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/profile/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formState.name.trim(),
          email: formState.email.trim(),
          password: formState.password.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.message || "Could not update profile.");
        return;
      }

      setUser(data.user);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Profile update failed:", error);
      setFormError("Profile update failed. Please try again.");
    } finally {
      setIsSaving(false);
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
              <img
                src={getResolvedAvatarUrl(user.avatarUrl)}
                alt="Avatar"
                className={styles.avatarImg}
                onError={() =>
                  setUser((currentUser) =>
                    currentUser ? { ...currentUser, avatarUrl: "" } : currentUser,
                  )
                }
              />
            ) : (
              user?.name.charAt(0).toUpperCase()
            )}
          </div>

          {showAvatarMenu && (
            <div className={styles.avatarOverlay}>
              <button onClick={triggerFileSelect}>Change Photo</button>
              <button onClick={deleteAvatar} className={styles.deleteBtn}>Delete Photo</button>
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
          <button className={styles.editBtn} onClick={openEditModal}>Edit Profile</button>
        </div>
      </main>

      {isEditModalOpen && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Edit Profile</h2>
                <p className={styles.modalSubtitle}>Update your account details.</p>
              </div>
              <button className={styles.closeBtn} onClick={closeEditModal} type="button">
                ×
              </button>
            </div>

            <form className={styles.modalForm} onSubmit={handleProfileUpdate}>
              <div className={styles.formField}>
                <label className={styles.modalLabel}>Name</label>
                <input
                  className={styles.modalInput}
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.modalLabel}>Email</label>
                <input
                  className={styles.modalInput}
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.modalLabel}>New Password</label>
                <input
                  className={styles.modalInput}
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Leave blank to keep current password"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.modalLabel}>Confirm Password</label>
                <input
                  className={styles.modalInput}
                  type="password"
                  value={formState.confirmPassword}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Repeat new password"
                />
              </div>

              {formError && <p className={styles.formError}>{formError}</p>}

              <div className={styles.modalActions}>
                <button
                  className={styles.cancelBtn}
                  type="button"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button className={styles.saveBtn} type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
