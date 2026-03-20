import React from "react";
import NotificationCenter from "../components/NotificationCenter";
import styles from "./Notifications.module.css";

const Notifications: React.FC = () => {
  return (
    <div className={styles.container}>
      <NotificationCenter />
    </div>
  );
};

export default Notifications;
