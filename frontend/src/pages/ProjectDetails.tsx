import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import WorkflowSection from "../components/projectdetails/WorkflowSection";
import TeamSection from "../components/projectdetails/TeamSection";
import styles from "./ProjectDetails.module.css";

const ProjectDetails: React.FC = () => {
  // get the ID from the URL (e.g., /project/:id)
  const { id } = useParams<{ id: string }>();
  const { projectId } = useParams<{ projectId: string }>();

  // state for the data
  const [loading, setLoading] = useState(true);
  const [userRole] = useState("PROJECT_ADMIN"); // Mock role
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [members, setMembers] = useState([
    { email: "owner@pro.com", role: "GLOBAL_ADMIN" },
    { email: "manager@pro.com", role: "PROJECT_ADMIN" },
    { email: "dev@pro.com", role: "PROJECT_MEMBER" },
  ]);
  
  useEffect(() => {
    const loadProjectData = async () => {
      // Simulating a network delay
      setTimeout(() => {
        setWorkflows(["Design System", "Mobile API", "Unit Testing"]);
        setMembers([
          { email: "owner@pro.com", role: "GLOBAL_ADMIN" },
          { email: "manager@pro.com", role: "PROJECT_ADMIN" },
          { email: "dev@pro.com", role: "PROJECT_MEMBER" },
        ]);
        setLoading(false);
      }, 800);
    };
    loadProjectData();
  }, [id]);
  
  // 2. The function that tests "Change Role"
  // const handleUpdateRole = (email: string, newRole: string) => {
  //   setMembers((prevMembers) =>
  //     prevMembers.map((m) => 
  //       m.email === email ? { ...m, role: newRole } : m
  //     )
  //   );
  //   console.log(`Updated ${email} to ${newRole}`);
  // };
  // Inside ProjectDetails.tsx

  const handleUpdateRole = async (email: string, newRole: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // REMOVED: Authorization header (Cookie handles this now)
        },
        // CRITICAL: This allows the browser to send the HTTP-only cookie
        credentials: "include", 
        body: JSON.stringify({ email, role: newRole })
      });

      if (response.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.email === email ? { ...m, role: newRole } : m))
        );
      } else {
        const errorData = await response.json();
        alert(`Failed to update role: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Network error updating role:", error);
    }
  };

  // 1. Remove Member (DELETE Request)
  const handleRemoveMember = async (email: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Required for HTTP-only cookies
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setMembers((prev) => prev.filter((m) => m.email !== email));
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  // 2. Add Workflow/Board (POST Request)
  const handleAddWorkflow = async (name: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        const newWorkflow = await response.json();
        setWorkflows((prev) => [...prev, newWorkflow.name]);
      }
    } catch (error) {
      console.error("Failed to add workflow:", error);
    }
  };

  // 3. Add Member/Invite (POST Request)
  const handleAddMember = async (email: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: "PROJECT_MEMBER" })
      });

      if (response.ok) {
        const addedMember = await response.json();
        setMembers((prev) => [...prev, addedMember]);
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Could not invite user.");
      }
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  if (loading) return <div className={styles.loader}>Loading Project Data...</div>;

  return (
    <div className={styles.container}>
      {/* Header showing which project we are in */}
      <header className={styles.projectHeader}>
        <h1 className={styles.projectName}>Project Id : {id}</h1>
        <p className={styles.projectMeta}>Active Workflows: {workflows.length}</p>
      </header>

      <div className={styles.layoutGrid}>
        {/* Left Column: Workflows */}
        <section className={styles.mainCol}>
          <WorkflowSection 
            workflows={workflows} 
            userRole={userRole} 
            onAdd={handleAddWorkflow} 
          />
        </section>

        {/* Right Column: Team Sidebar */}
        <aside className={styles.sideCol}>
        <TeamSection 
          members={members} 
          userRole={userRole}//"GLOBAL_ADMIN"
          onAddMember={handleAddMember} // Pass the missing prop here
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
        />
        </aside>
      </div>
    </div>
  );
};

export default ProjectDetails;