import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import WorkflowSection from "../components/projectdetails/WorkflowSection";
import TeamSection from "../components/projectdetails/TeamSection";
import styles from "./ProjectDetails.module.css";

interface ProjectMemberResponse {
  role: string;
  user: {
    role: string;
    email: string;
    name: string;
  };
}

interface BoardResponse {
  id: string;
  name: string;
}

interface ProjectDataResponse {
  project: {
    name: string;
    id: string;
    description: string | null;
    members: ProjectMemberResponse[];
    boards: BoardResponse[];
  };
}


const ProjectDetails: React.FC = () => {
  // get the ID from the URL (e.g., /project/:id)

  const { id } = useParams<{ id: string }>();

  // state for the data
  const [projectName, setProjectName] = useState("P"); // New state
  const [loggedInUserEmail, setLoggedInUserEmail] = useState("_");
  const [description, setDescription] = useState("Loading description...");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState("");
  const [loading, setLoading] = useState(true);
  //const [userRole] = useState("PROJECT_ADMIN"); // Mock role
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [members, setMembers] = useState([
    { email: "owner@pro.com", role: "GLOBAL_ADMIN" },
    { email: "manager@pro.com", role: "PROJECT_ADMIN" },
    { email: "dev@pro.com", role: "PROJECT_MEMBER" },
  ]);
  const [viewerRole, setViewerRole] = useState("POJECT_ADMIN");
  
  useEffect(() => {
  const loadAllData = async () => {
    try {
      // 1. Fetch user profile first
      const profileResponse = await fetch(import.meta.env.VITE_BACKEND_ORIGIN + "/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      let userEmail = "_";
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        userEmail = profileData.user.email;
        setLoggedInUserEmail(userEmail);
      }

      // 2. Then fetch project data
      if (id) {
        const projectResponse = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/get-project/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });
        
        if (projectResponse.ok) {
          const data: ProjectDataResponse = await projectResponse.json();
          const project = data.project;
          
          setProjectName(project.name);
          const workflowNames = project.boards.map((b: BoardResponse) => b.name);
          setWorkflows(workflowNames);
          
          const formattedMembers = project.members.map((m: ProjectMemberResponse) => ({
            email: m.user.email,
            role: m.role
          }));
          
          setMembers(formattedMembers);
          
          // Now loggedInUserEmail is properly set
          const currentMember = project.members.find(
            (member) => member.user.email === userEmail
          );
          
          setViewerRole(currentMember?.role ?? "PROJECT_VIEWER");
          setDescription(project.description || "No description provided.");
          setTempDesc(project.description || "");
        }
      }
    } catch (error) {
      console.error("Data loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  loadAllData();
}, [id]); // Add id as dependency
  
  const handleUpdateDescription = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/set-project-description`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId: id, description: tempDesc })
      });
  
      if (response.ok) {
        setDescription(tempDesc);
        setIsEditingDesc(false);
      } else {
        const errorData = await response.json();
        alert(`Update failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error updating description:", error);
    }
  };


  const handleUpdateRole = async (email: string, newRole: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/change-member-role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // REMOVED: Authorization header (Cookie handles this now)
        },
        // CRITICAL: This allows the browser to send the HTTP-only cookie
        credentials: "include", 
        body: JSON.stringify({ projectId : id , memberEmail : email, role: newRole })
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/delete-member`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Required for HTTP-only cookies
        body: JSON.stringify({ projectId : id , memberEmail: email })
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/add-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name , projectId : id })
      });

      if (response.ok) {
        const newWorkflow = await response.json();
        setWorkflows((prev) => [...prev, newWorkflow.name]);
      }
    } catch (error) {
      console.error("Failed to add workflow:", error);
    }
  };

  //const handleDeleteWorkflow = async (name: string) => {}

  
  const handleAddMember = async (email: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/add-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Required for HTTP-only cookies 
        body: JSON.stringify({ 
          projectId: id, 
          memberEmail: email 
        })
      });
  
      if (response.ok) {
        const data = await response.json();
        // Extract data based on your backend: res.status(200).json({ projectMember, user })
        const newMember = { 
          email: data.user.email, 
          role: data.projectMember.role 
        };
        
        setMembers((prev) => [...prev, newMember]);
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
        <h1 className={styles.projectName}>Project Name : {projectName}</h1>
        <p className={styles.projectMeta}>Active Workflows: {workflows.length}</p>
      </header>
      <section className={styles.descriptionBox}>
        <div className={styles.descHeader}>
          <label>Project Description</label>
          {(viewerRole === "GLOBAL_ADMIN" || viewerRole === "PROJECT_ADMIN") && !isEditingDesc && (
            <button className={styles.editBtn} onClick={() => setIsEditingDesc(true)}>
              ✎ Edit
            </button>
          )}
        </div>

        {isEditingDesc ? (
          <div className={styles.editArea}>
            <textarea
              value={tempDesc}
              onChange={(e) => setTempDesc(e.target.value)}
              className={styles.descInput}
            />
            <div className={styles.editActions}>
              <button onClick={handleUpdateDescription} className={styles.saveBtn}>Save</button>
              <button onClick={() => { setIsEditingDesc(false); setTempDesc(description); }} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <p className={styles.descText}>{description}</p>
        )}
      </section>
      <div className={styles.layoutGrid}>
        {/* Left Column: Workflows */}
        <section className={styles.mainCol}>
          <WorkflowSection 
            workflows={workflows} 
            userRole={viewerRole} 
            onAdd={handleAddWorkflow} 
          />
        </section>

        {/* Right Column: Team Sidebar */}
        <aside className={styles.sideCol}>
        <TeamSection 
          members={members} 
          userRole={viewerRole}//"GLOBAL_ADMIN"
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