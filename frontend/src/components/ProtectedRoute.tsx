import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactElement;
  roles?: string[];
}) {
  const { user, token } = useAuth();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page">
        <div className="card">
          <h2>Access denied</h2>
          <p>Your role ({user.role}) does not have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return children;
}
