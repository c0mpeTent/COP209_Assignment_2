import React from "react";
import styles from "./Kanban.module.css";

interface HeaderProps {
  title: string;
  currentCount: number;
  limit: number;
}

const ColumnHeader: React.FC<HeaderProps> = ({ title, currentCount, limit }) => {
  // 5. Visual feedback: turn ratio red if limit is reached
  const isAtLimit = currentCount >= limit;

  return (
    <div className={styles.columnHeader}>
      <h3>{title}</h3>
      <span className={isAtLimit ? styles.wipLimitFull : styles.wipLimit}>
        {currentCount}/{limit} 
      </span>
    </div>
  );
};

export default ColumnHeader;