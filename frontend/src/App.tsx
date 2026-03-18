import { Routes, Route, Navigate} from 'react-router-dom';
import { useState, useEffect } from 'react';
import ProjectDetails from './pages/ProjectDetails';
import './App.css';

// Import your Auth component
import AuthForm from './components/AuthForm';

// Import your Shared Layout
import Layout from './components/Layout';

// Import your Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import WorkflowBoard from './pages/WorkflowBoard';
//import Notifications from './pages/Notifications';
//import TaskDetails from './pages/TaskDetails';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // 'null' means "loading"
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}/api/auth/me`, {
          method: "GET",
          credentials: "include", 
        });
        
        setIsAuthenticated(response.ok);
      } catch (error) {
        console.error("Auth Check Failed:", error); // Now the variable is used!
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []); 

  // While waiting for the server, show a spinner or nothing
  if (isLoading) {
    return <div className="loading">Checking authentication...</div>;
  }

  return (
    <div className="app">
      <Routes>
        {/* auth routes */}
        <Route path="/auth" element={<AuthForm />} />

        {/* dashboard route */}
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/auth" />
            )
          } 
        />
        {/* project route */}
        <Route 
          path="/project/:id"  // The ':id' is the dynamic part
          element={
            isAuthenticated ? (
              <Layout>
                <ProjectDetails />
              </Layout>
            ) : (
              <Navigate to="/auth" />
            )
          } 
        />
        {/* <Route 
          path="/project/:projectId/workflow/:workflowId/task/:taskId"
          element={
            isAuthenticated ? (
              <Layout>
                <TaskDetails />
              </Layout>
            ) : (
              <Navigate to="/auth" />
            )
          }
        /> */}
        <Route 
          path="/project/:projectId/workflow/:workflowId" 
          element={
            isAuthenticated ? (
              <Layout>
                <WorkflowBoard />
              </Layout>
            ) : (
              <Navigate to="/auth" />
            )
          } 
        />
        <Route 
          path="/profile" 
          element={
            isAuthenticated ? (
              <Layout>
                <Profile />
              </Layout>
            ) : (
              <Navigate to="/auth" />
            )
          } 
        />
        {/* <Route
          path="/notifications"
          element={
            isAuthenticated ? (
              <Layout>
                <Notifications />
              </Layout>
            ) : (
              <Navigate to="/auth" />
            )
          }
        /> */}

        {/* default path: if logged in, go to dashboard; else, go to auth */}
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} />} 
        />
        {/* additiaonal safty check */}
        {/* catch-all: If user types a random URL, send them back to safety */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;