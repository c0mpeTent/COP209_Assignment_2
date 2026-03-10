import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import your Auth component
import AuthForm from './components/AuthForm';

// Import your Shared Layout
import Layout from './components/Layout';

// Import your Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

function App() {
  // Simple check: do we have a token in LocalStorage?
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <div className="app">
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/auth" element={<AuthForm />} />

        {/* --- PROTECTED ROUTES (Wrapped in Layout) --- */}
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