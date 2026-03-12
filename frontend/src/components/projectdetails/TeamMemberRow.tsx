import React, { useState } from "react";
import styles from "./ProjectSections.module.css";

interface Member {
  email: string;
  role: string;
}


interface TeamMemberRowProps {
  member: Member;
  canChangeRoles: boolean;
  // New prop to handle the actual change
  onUpdateRole: (email: string, newRole: string) => void;
  onRemove: (email: string) => void;
}


const TeamMemberRow: React.FC<TeamMemberRowProps> = ({ 
  member, 
  canChangeRoles, 
  onUpdateRole,
  onRemove 
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRoleChange = (newRole: string) => {
    onUpdateRole(member.email, newRole);
    setMenuOpen(false); // Close menu after selection
  };

  return (
    <li className={styles.listItem}>
      <div className={styles.userInfo}>
        <span className={styles.userEmail}>{member.email}</span>
        <span className={`${styles.roleBadge} ${styles[member.role.toLowerCase().replace(" ", "_")]}`}>
          {member.role.replace("_", " ")}
        </span>
      </div>

      <div className={styles.menuContainer}>
        {canChangeRoles ? (
          <>
            <button className={styles.threeDots} onClick={() => setMenuOpen(!menuOpen)}>⋮</button>
            
            {menuOpen && (
              <div className={styles.dropdownMenu}>
                <p className={styles.menuTitle}>Change Role</p>
                {/* Specific Roles defined in your Problem Statement */}
                <button onClick={() => handleRoleChange("PROJECT_ADMIN")}>Project Admin</button>
                <button onClick={() => handleRoleChange("PROJECT_MEMBER")}>Project Member</button>
                <button onClick={() => handleRoleChange("PROJECT_VIEWER")}>Project Viewer</button>
                <hr className={styles.divider} />
                <button 
                  className={styles.removeBtn} 
                  onClick={() => onRemove(member.email)}
                >
                  Remove User
                </button>
              </div>
            )}
          </>
        ) : (
          <span className={styles.disabledDots}>⋮</span>
        )}
      </div>
    </li>
  );
};

export default TeamMemberRow;