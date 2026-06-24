import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const currentUser = useStore((state) => state.currentUser);

  if (!currentUser) {
    return <Navigate to="/portal/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') return <Navigate to="/portal/admin" replace />;
    if (currentUser.role === 'agent' || currentUser.role === 'sub_agent') return <Navigate to="/portal/agent" replace />;
    return <Navigate to="/portal/student" replace />;
  }

  return <>{children}</>;
}
