import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public pages
import Landing      from './pages/public/Landing';
import Login        from './pages/public/Login';
import Register     from './pages/public/Register';
import Reschedule   from './pages/public/Reschedule';

// Patient pages
import DoctorDiscovery    from './pages/patient/DoctorDiscovery';
import BookingFlow        from './pages/patient/BookingFlow';
import PatientDashboard   from './pages/patient/PatientDashboard';
import PrescriptionFollowUp from './pages/patient/PrescriptionFollowUp';

// Doctor pages
import DoctorDashboard  from './pages/doctor/DoctorDashboard';
import ConsultationView from './pages/doctor/ConsultationView';
import LeaveManager     from './pages/doctor/LeaveManager';

// Admin pages
import AdminDashboard    from './pages/admin/AdminDashboard';
import DoctorManagement  from './pages/admin/DoctorManagement';

// Chatbot
import AIChatbot from './components/chat/AIChatbot';

// Toast
import { ToastProvider } from './components/ui/NotificationToast';

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner spinner-lg" />
        <p className="text-secondary text-sm">Loading HealthSync...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public & Doctor Discovery */}
        <Route path="/"                element={<Landing />} />
        <Route path="/doctors"         element={<DoctorDiscovery />} />
        <Route path="/patient/doctors" element={<DoctorDiscovery />} />
        <Route path="/login"           element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />
        <Route path="/register"        element={user ? <Navigate to={`/${user.role}`} replace /> : <Register />} />
        <Route path="/reschedule"      element={<Reschedule />} />

        {/* Patient Authenticated Routes */}
        <Route path="/patient" element={<ProtectedRoute role="patient" />}>
          <Route index                   element={<PatientDashboard />} />
          <Route path="book/:doctorId"   element={<BookingFlow />} />
          <Route path="prescription/:id" element={<PrescriptionFollowUp />} />
        </Route>

        {/* Doctor Authenticated Routes */}
        <Route path="/doctor" element={<ProtectedRoute role="doctor" />}>
          <Route index                  element={<DoctorDashboard />} />
          <Route path="consultation/:id" element={<ConsultationView />} />
          <Route path="leave"           element={<LeaveManager />} />
        </Route>

        {/* Admin Authenticated Routes */}
        <Route path="/admin" element={<ProtectedRoute role="admin" />}>
          <Route index               element={<AdminDashboard />} />
          <Route path="doctors"      element={<DoctorManagement />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AIChatbot />
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
