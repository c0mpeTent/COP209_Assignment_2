import React from "react";
import TeamMemberRow from "./TeamMemberRow";
import styles from "./ProjectSections.module.css";

interface TeamMember {
  email: string;
  role: string;
}

interface TeamProps {
  members: TeamMember[];
  userRole: string;
  onAddMember: (email: string) => void;
}

const TeamSection: React.FC<TeamProps> = ({ members, userRole, onAddMember }) => {
  const canAddMembers = userRole === "GLOBAL_ADMIN" || userRole === "PROJECT_ADMIN";
  const canChangeRoles = userRole === "GLOBAL_ADMIN";

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Project Team</h2>
        {canAddMembers && (
          <div className={styles.inputGroup}>
            <input type="email" placeholder="Invite by email..." id="teamInput" />
            <button 
              className={styles.addBtn}
              onClick={() => {
                const el = document.getElementById("teamInput") as HTMLInputElement;
                if(el.value) onAddMember(el.value);
                el.value = "";
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <ul className={styles.list}>
        {members.map((m, i) => (
          <TeamMemberRow 
            key={i} 
            member={m} 
            canChangeRoles={canChangeRoles} 
          />
        ))}
      </ul>
    </div>
  );
};

export default TeamSection;