import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import WorkflowSection from "../components/projectdetails/WorkflowSection";
import TeamSection from "../components/projectdetails/TeamSection";
import styles from "./ProjectDetails.module.css";
import type { Board } from "../types/kanban";

interface ProjectMemberResponse {
  role: string;
  user: {
    email: string;
    name: string;
  };
}

interface BoardResponse {
  id: string;
  name: string;
  projectId: string;
}

interface ProjectDataResponse {
  viewerRole: string;
  project: {
    name: string;
    id: string;
    description: string | null;
    isArchived: boolean;
    createdAt?: string;
    updatedAt?: string;
    members: ProjectMemberResponse[];
    boards: BoardResponse[];
  };
}

interface TeamMember {
  email: string;
  role: string;
}

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [projectName, setProjectName] = useState("Project");
  const [description, setDescription] = useState("Loading description...");
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [viewerRole, setViewerRole] = useState("PROJECT_VIEWER");
  const [isArchived, setIsArchived] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");

  const [projectDescriptionInput, setProjectDescriptionInput] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [isArchiving, setIsArchiving] = useState(false);
  const [isAddingWorkflow, setIsAddingWorkflow] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const canManageProject =
    viewerRole === "GLOBAL_ADMIN" || viewerRole === "PROJECT_ADMIN";
  const effectiveRole = isArchived ? "PROJECT_VIEWER" : viewerRole;

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) {
      return "";
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadProjectData = useCallback(async () => {
    if (!id) return;

    try {
      const projectResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/get-project/${id}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json();
        throw new Error(errorData.message || "Could not load project");
      }

      const data: ProjectDataResponse = await projectResponse.json();
      const project = data.project;

      setProjectName(project.name);
      setDescription(project.description || "No description provided.");
      setProjectNameInput(project.name);
      setProjectDescriptionInput(project.description || "");
      setIsArchived(project.isArchived);

      setCreatedAt(project.createdAt ?? null);
      setUpdatedAt(project.updatedAt ?? null);
      setViewerRole(data.viewerRole || "PROJECT_VIEWER");

      const workflowNames = project.boards.map((board: BoardResponse) => board.name);
      setWorkflows(workflowNames);
      setBoards(project.boards);

      const formattedMembers = project.members.map((member) => ({
        email: member.user.email,
        role: member.role,
      }));
      setMembers(formattedMembers);
    } catch (error) {
      console.error("Data loading error:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadProjectData();
  }, [loadProjectData]);

  const handleUpdateProject = async () => {
    if (!id || !projectNameInput.trim()) {
      setSaveError("Project name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");

      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/update/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: projectNameInput,
            description: projectDescriptionInput,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setSaveError(data.message || "Update failed");
        return;
      }

      setProjectName(data.project.name);
      setDescription(data.project.description || "No description provided.");
      setProjectNameInput(data.project.name);
      setProjectDescriptionInput(data.project.description || "");
      setUpdatedAt(data.project.updatedAt ?? null);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating project:", error);
      setSaveError("Could not update project details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!id) {
      return;
    }

    const action = isArchived ? "restore" : "archive";
    const confirmed = window.confirm(
      `Do you want to ${action} this project now?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsArchiving(true);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/archive/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isArchived: !isArchived }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        alert(`Update failed: ${data.message}`);
        return;
      }

      setIsArchived(data.project.isArchived);
      setUpdatedAt(data.project.updatedAt ?? null);
    } catch (error) {
      console.error("Project archive update failed:", error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUpdateRole = async (email: string, newRole: string) => {
    try {
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/change-member-role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ projectId: id, memberEmail: email, role: newRole }),
        }
      );

      if (response.ok) {
        setMembers((prev) =>
          prev.map((member) =>
            member.email === email ? { ...member, role: newRole } : member
          )
        );
      } else {
        const errorData = await response.json();
        alert(`Failed to update role: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Network error updating role:", error);
    }
  };

  const handleAddWorkflow = async (name: string) => {
    try {
      setIsAddingWorkflow(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/add-workflow`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, projectId: id }),
        }
      );

      if (response.ok) {
        const newWorkflow = await response.json();
        setWorkflows((prev) => [...prev, newWorkflow.name]);
        setBoards((prev) => [...prev, newWorkflow]);
      }
    } catch (error) {
      console.error("Failed to add workflow:", error);

    } finally {
      setIsAddingWorkflow(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string, workflowName: string) => {
    const confirmed = window.confirm(
      `Do you want to delete the workflow "${workflowName}"? This will also remove its tasks and columns.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingWorkflowId(workflowId);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete-workflow/${workflowId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Could not delete workflow.");
        return;
      }

      setBoards((prev) => {
        const nextBoards = prev.filter((board) => board.id !== workflowId);
        setWorkflows(nextBoards.map((board) => board.name));
        return nextBoards;
      });
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    } finally {
      setDeletingWorkflowId((current) => (current === workflowId ? null : current));
    }
  };

  const handleAddMember = async (email: string) => {
    try {
      setIsAddingMember(true);
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/add-member`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            projectId: id,
            memberEmail: email,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const newMember = {
          email: data.user.email,
          role: data.projectMember.role,
        };

        setMembers((prev) => [...prev, newMember]);
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Could not invite user.");
      }
    } catch (error) {
      console.error("Failed to add member:", error);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    try {
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete-member`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ projectId: id, memberEmail: email }),
        }
      );

      if (response.ok) {
        setMembers((prev) => prev.filter((member) => member.email !== email));
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  if (loading) return <div className={styles.loader}>Loading Project Data...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.projectHeader}>
        <div>
          <h1 className={styles.projectName}> {projectName}</h1>
          <div className={styles.metaRow}>
            <p className={styles.projectMeta}>Active Workflows: {workflows.length}</p>
            <span
              className={`${styles.statusBadge} ${
                isArchived ? styles.archivedBadge : styles.activeBadge
              }`}
            >
              {isArchived ? "Archived" : "Active"}
            </span>
          </div>
          {(createdAt || updatedAt) && (
            <div className={styles.timestampRow}>
              {createdAt && (
                <span className={styles.timestampItem}>
                  <span className={styles.timestampLabel}>Created</span>{" "}
                  {formatTimestamp(createdAt)}
                </span>
              )}
              {updatedAt && (
                <span className={styles.timestampItem}>
                  <span className={styles.timestampLabel}>Last updated</span>{" "}
                  {formatTimestamp(updatedAt)}
                </span>
              )}
            </div>
          )}
        </div>

        {canManageProject && (
          <div className={styles.headerActions}>
            <button
              className={styles.editProjectBtn}
              onClick={() => {
                setProjectNameInput(projectName);
                setProjectDescriptionInput(
                  description === "No description provided." ? "" : description
                );
                setSaveError("");
                setIsEditModalOpen(true);
              }}
            >
              Edit Project
            </button>
            <button
              className={isArchived ? styles.restoreBtn : styles.archiveBtn}
              onClick={handleArchiveToggle}
              disabled={isArchiving}
            >
              {isArchiving
                ? isArchived
                  ? "Restoring..."
                  : "Archiving..."
                : isArchived
                  ? "Restore Project"
                  : "Archive Project"}
            </button>
          </div>
        )}
      </header>

      <section className={styles.descriptionBox}>
        <div className={styles.descHeader}>
          <label>Project Description</label>
          {isArchived && (
            <span className={styles.readOnlyNote}>
              This project is archived and currently read-only in the UI.
            </span>
          )}
        </div>
        <p className={styles.descText}>{description}</p>
      </section>

      <div className={styles.layoutGrid}>
        <section className={styles.mainCol}>
          <WorkflowSection
            userRole={effectiveRole}
            boards={boards}
            onDelete={handleDeleteWorkflow}
            isAdding={isAddingWorkflow}
            onAdd={handleAddWorkflow}
            deletingWorkflowId={deletingWorkflowId}
          />
        </section>

        <aside className={styles.sideCol}>
          <TeamSection
            members={members}
            userRole={effectiveRole}
            isAddingMember={isAddingMember}
            onAddMember={handleAddMember}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
          />
        </aside>
      </div>

      {isEditModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Edit Project</h2>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalForm}>
              <label className={styles.modalLabel} htmlFor="project-name">
                Project Name
              </label>
              <input
                id="project-name"
                className={styles.modalInput}
                type="text"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
              />

              <label className={styles.modalLabel} htmlFor="project-description">
                Project Description
              </label>
              <textarea
                id="project-description"
                className={styles.modalTextarea}
                value={projectDescriptionInput}
                onChange={(e) => setProjectDescriptionInput(e.target.value)}
              />

              {saveError && <p className={styles.formError}>{saveError}</p>}

              <div className={styles.modalActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleUpdateProject}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
