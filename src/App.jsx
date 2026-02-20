import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Simulator from './pages/Simulator';
import CaseManagement from './pages/CaseManagement';
import Analytics from './pages/Analytics';
import KafkaMonitor from './pages/KafkaMonitor';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import './index.css';

/** Guard: redirect to /login if no auth token in localStorage. */
function PrivateRoute({ children }) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="app-layout">
      <Sidebar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/simulator" element={<PrivateRoute><Simulator /></PrivateRoute>} />
        <Route path="/cases" element={<PrivateRoute><CaseManagement /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/kafka" element={<PrivateRoute><KafkaMonitor /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
