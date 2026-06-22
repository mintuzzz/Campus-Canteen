import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRole: 'student' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm animate-pulse font-medium">Validating security credentials...</p>
      </div>
    );
  }

  if (!user) {
    // If not logged in, direct to login page corresponding to the target role
    return <Navigate to={allowedRole === 'admin' ? '/admin/login' : '/login'} replace />;
  }

  if (user.role !== allowedRole) {
    // If logged in but role mismatch, redirect to respective correct home dashboard
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/'} replace />;
  }

  // Render sub routes
  return <Outlet />;
};
