import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  //const location = useLocation();

  // dynamic breadcrumb text
  //const currentPage = location.pathname.replace("/", "") || "Home";

  return (
    <div className={styles.container}>
      {/* sidebar component */}
      <Sidebar />

      {/* Maintext area */}
      <div className={styles.mainWrapper}>
        {/* Top Navbar / Breadcrumb */}
        {/* <header className={styles.topNav}>
          <span className={styles.breadcrumb}>
            Pages / <span className={styles.currentPath}>{currentPage}</span>
          </span>
        </header> */}

        {/* pages rendered */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;