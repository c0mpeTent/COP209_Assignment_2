import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import WorkflowSection from "../components/projectdetails/WorkflowSection";
import TeamSection from "../components/projectdetails/TeamSection";
import styles from "./ProjectDetails.module.css";

const ProjectDetails: React.FC = () => {
  // get the ID from the URL (e.g., /project/:id)
  const { id } = useParams<{ id: string }>();

  // state for the data
  const [loading, setLoading] = useState(true);
  const [userRole] = useState("PROJECT_ADMIN"); // Mock role
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [team, setTeam] = useState<{ email: string; role: string }[]>([]);

  useEffect(() => {
    const loadProjectData = async () => {
      // Simulating a network delay
      setTimeout(() => {
        setWorkflows(["Design System", "Mobile API", "Unit Testing"]);
        setTeam([
          { email: "owner@pro.com", role: "GLOBAL_ADMIN" },
          { email: "manager@pro.com", role: "PROJECT_ADMIN" },
          { email: "dev@pro.com", role: "PROJECT_MEMBER" },
        ]);
        setLoading(false);
      }, 800);
    };
    loadProjectData();
  }, [id]);

  // Action Handlers (Passed down to children)
  const handleAddWorkflow = (name: string) => {
    setWorkflows((prev) => [...prev, name]);
    // TODO: Send POST to /api/projects/:id/workflows
  };

  const handleAddMember = (email: string) => {
    setTeam((prev) => [...prev, { email, role: "PROJECT_MEMBER" }]); // Default role
    // TODO: Send POST to /api/projects/:id/members
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
            members={team} 
            userRole={userRole} 
            onAddMember={handleAddMember} 
          />
        </aside>
      </div>
    </div>
  );
};

export default ProjectDetails;