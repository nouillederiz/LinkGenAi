import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AdminLogin from './components/AdminLogin';
import Dashboard from './components/Dashboard';
import LinkManager from './components/LinkManager';
import PageManager from './components/PageManager';
import AIEditor from './components/AIEditor';
import axios from 'axios';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/admin/check');
      setIsAuthenticated(res.data.authenticated);
    } catch {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">Chargement...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/admin/login" element={isAuthenticated ? <Navigate to="/admin" /> : <AdminLogin onLogin={checkAuth} />} />
        
        <Route path="/admin" element={isAuthenticated ? <Dashboard /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/links" element={isAuthenticated ? <LinkManager /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/pages" element={isAuthenticated ? <PageManager /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/pages/new" element={isAuthenticated ? <AIEditor /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/pages/edit/:id" element={isAuthenticated ? <AIEditor /> : <Navigate to="/admin/login" />} />
        
        <Route path="/" element={<Navigate to="/admin" />} />
      </Routes>
    </Router>
  );
}
