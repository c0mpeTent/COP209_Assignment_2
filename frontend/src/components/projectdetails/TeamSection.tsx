import React, { useState } from "react";
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
  // Added these handlers to support Global Admin actions
  onUpdateRole: (email: string, newRole: string) => void;
  onRemoveMember: (email: string) => void;
}

const TeamSection: React.FC<TeamProps> = ({ 
  members, 
  userRole, 
  onAddMember,
  onUpdateRole,
  onRemoveMember
}) => {
  const [inviteEmail, setInviteEmail] = useState("");
  
  const canAddMembers = userRole === "GLOBAL_ADMIN" || userRole === "PROJECT_ADMIN";
  const canChangeRoles = userRole === "GLOBAL_ADMIN";

  const handleAdd = () => {
    if (inviteEmail) {
      onAddMember(inviteEmail);
      setInviteEmail("");
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Project Team</h2>
        {canAddMembers && (
          <div className={styles.inputGroup}>
            <input 
              type="email" 
              placeholder="Invite by email..." 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button className={styles.addBtn} onClick={handleAdd}>
              Add
            </button>
          </div>
        )}
      </div>

      <ul className={styles.list}>
        {members.map((m) => (
          <TeamMemberRow 
            key={m.email} // Using email as key is safer than index for lists that change
            member={m} 
            canChangeRoles={canChangeRoles}
            onUpdateRole={onUpdateRole}
            onRemove={onRemoveMember}
          />
        ))}
      </ul>
    </div>
  );
};

export default TeamSection;