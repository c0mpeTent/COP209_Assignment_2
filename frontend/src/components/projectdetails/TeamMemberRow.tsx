import React, { useState } from "react";
import styles from "./ProjectSections.module.css";

interface Member {
  email: string;
  role: string;
}

interface RowProps {
  member: Member;
  canChangeRoles: boolean;
}

const TeamMemberRow: React.FC<RowProps> = ({ member, canChangeRoles }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <li className={styles.listItem}>
      <div className={styles.userInfo}>
        <span className={styles.userEmail}>{member.email}</span>
        <span className={`${styles.roleBadge} ${styles[member.role.toLowerCase()]}`}>
          {member.role.replace("_", " ")}
        </span>
      </div>

      <div className={styles.menuContainer}>
        {canChangeRoles ? (
          <>
            <button 
              className={styles.threeDots} 
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ⋮
            </button>
            
            {menuOpen && (
              <div className={styles.dropdownMenu}>
                <p className={styles.menuTitle}>Change Role</p>
                <button onClick={() => console.log("Set Admin")}>Project Admin</button>
                <button onClick={() => console.log("Set Member")}>Project Member</button>
                <button onClick={() => console.log("Set Viewer")}>Project Viewer</button>
                <hr className={styles.divider} />
                <button className={styles.removeBtn}>Remove User</button>
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