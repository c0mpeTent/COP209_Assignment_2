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
  onAddMember: (email: string) => Promise<void>;
  // Added these handlers to support Global Admin actions
  onUpdateRole: (email: string, newRole: string) => void;
  onRemoveMember: (email: string) => void;
  isAddingMember?: boolean;
}

const TeamSection: React.FC<TeamProps> = ({ 
  members, 
  userRole, 
  onAddMember,
  onUpdateRole,
  onRemoveMember,
  isAddingMember = false,
}) => {
  const [inviteEmail, setInviteEmail] = useState("");
  
  const canAddMembers = userRole === "GLOBAL_ADMIN" || userRole === "PROJECT_ADMIN";
  const canChangeRoles = canAddMembers;

  const handleAdd = () => {
    if (inviteEmail) {
      void onAddMember(inviteEmail).then(() => setInviteEmail(""));
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.mainheading}>Project Team</h2>
        {canAddMembers && (
          <div className={styles.inputGroup}>
            <input 
              type="email" 
              placeholder="Invite by email..." 
              value={inviteEmail}
              disabled={isAddingMember}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button className={styles.addBtn} onClick={handleAdd} disabled={isAddingMember}>
              {isAddingMember ? "Adding..." : "Add"}
            </button>
          </div>
        )}
      </div>

      <ul className={styles.list}>
        {members.map((m) => (
          <TeamMemberRow 
            key={m.email} // Using email as key is safer than index for lists that change
            member={m} 
            currentUserRole={userRole}
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
