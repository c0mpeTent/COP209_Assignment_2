import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import WorkflowSection from "../components/projectdetails/WorkflowSection";
import TeamSection from "../components/projectdetails/TeamSection";
import styles from "./ProjectDetails.module.css";

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
  const [description, setDescription] = useState("Loading description...");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState("");
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
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/project/get-project/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });
    
        if (response.ok) {
          const data: ProjectDataResponse = await response.json(); // Explicit typing here
          const project = data.project;
    
          // 1. Map workflows from the 'boards' array
          console.log(project.name)
          setProjectName(project.name); // Set the project name from API
          const workflowNames = project.boards.map((b: BoardResponse) => b.name);
          setWorkflows(workflowNames);
    
          // 2. Map members to extract nested user details [cite: 96]
          const formattedMembers = project.members.map((m: ProjectMemberResponse) => ({
            email: m.user.email,
            role: m.role
          }));
          
          setMembers(formattedMembers);
          setDescription(project.description || "No description provided.");
          setTempDesc(project.description || "");
        }
      } catch (error) {
        console.error("Network error:", error);
      } finally {
        setLoading(false);
      }
    };
  
    if (id) {
      loadProjectData();
    }
  }, [id]);
  
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/projects/${id}/workflows`, {
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
          {(userRole === "GLOBAL_ADMIN" || userRole === "PROJECT_ADMIN") && !isEditingDesc && (
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