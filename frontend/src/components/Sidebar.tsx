import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import styles from "./Sidebar.module.css";

interface SidebarItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  isActive: boolean;
  badgeCount?: number;
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, projectId, workflowId } = useParams<{
    id?: string;
    projectId?: string;
    workflowId?: string;
  }>();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/notification`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not load notification count");
      }

      setUnreadCount(data.unreadCount ?? 0);
    } catch (error) {
      console.error("Unread notification count failed:", error);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();

    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [loadUnreadCount]);


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
  //const isActive = (path: string) => location.pathname === path;

  const isWorkflowPage = location.pathname.startsWith("/project/") &&
    location.pathname.includes("/workflow/");
  const isTaskPage = isWorkflowPage && location.pathname.includes("/task/");
  const isProjectPage =
  location.pathname.startsWith("/project/") && !isWorkflowPage;
  const isDashboardContext =
    location.pathname === "/dashboard" ||
    location.pathname === "/profile" ||
    location.pathname === "/notifications";

  const currentProjectPath = id ? `/project/${id}` : projectId ? `/project/${projectId}` : "/dashboard";
  const currentWorkflowPath = projectId && workflowId
      ? `/project/${projectId}/workflow/${workflowId}`
      : currentProjectPath;
  
  let items: SidebarItem[] = [];

  if (isTaskPage) {
    items = [
      {
        key: "profile",
        label: "Profile",
        icon: "👤",
        path: "/profile",
        isActive: location.pathname === "/profile",
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: "🔔",
        path: "/notifications",
        isActive: location.pathname === "/notifications",
        badgeCount: unreadCount,
      },
      {
        key: "back-workflow",
        label: "Back To Workflow",
        icon: "↩",
        path: currentWorkflowPath,
        isActive: false,
      },
    ];
  } else if (isWorkflowPage) {
    items = [
      {
        key: "profile",
        label: "Profile",
        icon: "👤",
        path: "/profile",
        isActive: location.pathname === "/profile",
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: "🔔",
        path: "/notifications",
        isActive: location.pathname === "/notifications",
        badgeCount: unreadCount,
      },
      {
        key: "back-project",
        label: "Back To Project",
        icon: "↩",
        path: currentProjectPath,
        isActive: false,
      },
    ];
  } else if (isProjectPage) {
    items = [
      {
        key: "profile",
        label: "Profile",
        icon: "👤",
        path: "/profile",
        isActive: location.pathname === "/profile",
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: "🔔",
        path: "/notifications",
        isActive: location.pathname === "/notifications",
        badgeCount: unreadCount,
      },
      {
        key: "back-dashboard",
        label: "Back To Dashboard",
        icon: "↩",
        path: "/dashboard",
        isActive: false,
      },
    ];
  } else if (isDashboardContext) {
    items = [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "📊",
        path: "/dashboard",
        isActive: location.pathname === "/dashboard",
      },
      {
        key: "profile",
        label: "Profile",
        icon: "👤",
        path: "/profile",
        isActive: location.pathname === "/profile",
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: "🔔",
        path: "/notifications",
        isActive: location.pathname === "/notifications",
        badgeCount: unreadCount,
      },
    ];
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>P</div>
          <h2 className={styles.logoText}>
            Project<span className={styles.logoAccent}>Pro</span>
          </h2>
        </div>

        <nav className={styles.navMenu}>
          {items.map((item) => (
            <button
              key={item.key}
              className={`${styles.navItem} ${item.isActive ? styles.active : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className={styles.notificationBadge}>
                  {item.badgeCount > 99 ? "99+" : item.badgeCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <span className={styles.icon}>⇥</span>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;