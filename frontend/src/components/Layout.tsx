import React from "react";
//import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  

  return (
    <div className={styles.container}>
      {/* sidebar component */}
      <Sidebar />

      {/* maintext area */}
      <div className={styles.mainWrapper}>

        {/* pages rendered */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;