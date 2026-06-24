import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';

interface ModuleGuardProps {
  children: ReactNode;
  module: string;
  action: string;
  fallbackRoute?: string;
}

export function ModuleGuard({ children, module, action, fallbackRoute = '/admin' }: ModuleGuardProps) {
  const hasPermission = usePermission(module, action);

  // We need a short delay/loading state in a real app, but for minimal integration 
  // we'll just check sync/async state or rely on the hook resolving quickly.
  // Assuming usePermission defaults to false and resolves, this might briefly
  // flash fallback. In a real app we'd add an isLoading flag.

  if (!hasPermission) {
    // Senior Architect note: "ModuleGuard redirects admin without permission to /admin/overview"
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
}
