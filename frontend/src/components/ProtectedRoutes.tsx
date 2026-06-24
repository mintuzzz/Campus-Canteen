import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRole: 'student' | 'canteen' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  // 1. Show loading spinner while verifying token on startup
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse font-medium">Verifying session...</p>
      </div>
    );
  }

  // 2. Not logged in → redirect to the appropriate login page
  if (!user) {
    const loginPath =
      allowedRole === 'admin' ? '/admin/login' :
      allowedRole === 'canteen' ? '/canteen/login' :
      '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // 3. Role mismatch → auto-logout and redirect to correct login
  if (user.role !== allowedRole) {
    logout();
    const loginPath =
      allowedRole === 'admin' ? '/admin/login' :
      allowedRole === 'canteen' ? '/canteen/login' :
      '/login';
    return <Navigate to={loginPath} replace />;
  }

  // 4. Authenticated + correct role → render child routes
  return <Outlet />;
};
