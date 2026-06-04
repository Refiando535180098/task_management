import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ClipboardList, Users, LogOut, ShieldAlert, Settings, ShieldCheck, LayoutDashboard } from 'lucide-react';

// Import Komponen
import Login from './components/Login';
import TaskManagement from './components/TaskManagement';
import AdminDashboard from './components/AdminDashboard';
import FormRekrutmen from './components/FormRekrutmen';
import CekStatus from './components/CekStatus';
import PortalHome from './components/PortalHome';

// Komponen Proteksi Rute Umum
const ProtectedRoute = ({ children }) => {
  const session = localStorage.getItem('syntegra_user_session');
  return session ? children : <Navigate to="/login" replace />;
};

const RecruitmentRoute = ({ children }) => {
  const sessionData = localStorage.getItem('syntegra_user_session');

  if (!sessionData) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(sessionData);

  const division = (user.division || '').toLowerCase();
  const role = (user.role || '').toLowerCase();

  const canAccess =
    division === 'hrd' ||
    division === 'pusat' ||
    role === 'admin' ||
    role === 'direksi' ||
    user.has_portal_access === true;

  return canAccess
    ? children
    : <Navigate to="/" replace />;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('syntegra_user_session'));

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
        
        {/* Dashboard Portal Utama (Gateway) */}
        <Route path="/" element={
          <ProtectedRoute>
            <PortalHome />
          </ProtectedRoute>
        } />

        {/* Modul Task Management */}
        <Route path="/" element={
          <ProtectedRoute>
            <TaskManagement />
          </ProtectedRoute>
        } />

        {/* Modul Recruitment (Hanya untuk yang berhak) */}
        <Route path="/recruitment-admin" element={
          <RecruitmentRoute>
            <AdminDashboard />
          </RecruitmentRoute>
        } />

        {/* Rute Publik (QR Code) */}
        <Route path="/FormRekrutmen" element={<FormRekrutmen />} />
        <Route path="/cek-status" element={<CekStatus />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}