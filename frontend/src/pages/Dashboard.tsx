import React, { useEffect, useMemo, useState } from "react";
import ProjectList from "../components/ProjectList"; // We'll create this next
import styles from "./Dashboard.module.css";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  role: string;
}

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);
  const [pendingArchiveProjectId, setPendingArchiveProjectId] = useState<string | null>(null);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.isArchived),
    [projects]
  );
  const archivedProjects = useMemo(
    () => projects.filter((project) => project.isArchived),
    [projects]
  );
  const visibleProjects = showArchivedProjects ? archivedProjects : activeProjects;

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || isCreatingProject) return;

    const payload = {
      name: newProjectName,
      description: "A new project management board",
    };

    try {
      setIsCreatingProject(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setProjects((prev) => [
          ...prev,
          { ...data.project, role: "GLOBAL_ADMIN", isArchived: false },
        ]);
        setNewProjectName("");
      } else {
        alert(`Error: ${data.message || "Could not create project"}`);
      }
    } catch (error) {
      console.error("Network/App Error:", error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setPendingDeleteProjectId(projectId);
      const deleteResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete/${projectId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        alert(`Error: ${errorData.message || "Could not delete project"}`);
        return;
      }

      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId)
      );
    } catch (error) {
      console.error("Network/App Error:", error);
    } finally {
      setPendingDeleteProjectId((current) => (current === projectId ? null : current));
    }
  };

  const handleArchiveToggle = async (projectId: string, isArchived: boolean) => {
    try {
      setPendingArchiveProjectId(projectId);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/archive/${projectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isArchived: !isArchived }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        alert(`Error: ${data.message || "Could not update project state"}`);
        return;
      }

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === projectId
            ? { ...project, isArchived: data.project.isArchived }
            : project
        )
      );
    } catch (error) {
      console.error("Project archive error:", error);
    } finally {
      setPendingArchiveProjectId((current) => (current === projectId ? null : current));
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [userRes, projRes] = await Promise.all([
          fetch(import.meta.env.VITE_BACKEND_ORIGIN + "/api/auth/me", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
          fetch(import.meta.env.VITE_BACKEND_ORIGIN + "/api/project/get", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setUserName(userData.user.name);
        }

        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects(projData.projects);
        }
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className={styles.loading}>Loading Workspace...</div>;

  return (
    <div className={styles.dashboardContainer}>
      <nav className={styles.Hiuser}>
        <div className={styles.navActions}>
          <span>Hi, {userName}</span>
        </div>
      </nav>

      <header className={styles.headercp}>
        <div className={styles.createGroup}>
          <input
            type="text"
            placeholder="Enter project name..."
            className={styles.projectInput}
            value={newProjectName}
            disabled={isCreatingProject}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <button
            className={styles.createBtn}
            onClick={handleCreateProject}
            disabled={isCreatingProject}
          >
            <span className={styles.plusIcon}>+</span>{" "}
            {isCreatingProject ? "Creating..." : "New Project"}
          </button>
        </div>
        <button
          className={styles.filterToggleBtn}
          onClick={() => setShowArchivedProjects((current) => !current)}
        >
          {showArchivedProjects ? "Active Projects" : "Archived Projects"}
        </button>
      </header>

      <div className={styles.listSection}>
        <ProjectList
          items={visibleProjects}
          title={showArchivedProjects ? "Archived Projects" : "Active Projects"}
          emptyMessage={
            showArchivedProjects
              ? "No archived projects right now."
              : "No active projects yet. Start by creating your first one."
          }
          onDelete={handleDeleteProject}
          onArchiveToggle={handleArchiveToggle}
          pendingDeleteId={pendingDeleteProjectId}
          pendingArchiveId={pendingArchiveProjectId}
        />
      </div>
    </div>
  );
};

export default Dashboard;
