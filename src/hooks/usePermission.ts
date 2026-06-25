import { useAuth } from '../shared/hooks/useAuth';

export function usePermission(module: string, action: string): boolean {
  const { user } = useAuth();
  
  if (!user) {
    return false;
  }

  // Super admins or wildcard permission holder sees everything
  if (user.role === 'super_admin' || user.permissions?.includes('*')) {
    return true;
  }

  // If user is not admin, deny all admin actions
  if (user.role !== 'admin') {
    return false;
  }

  // Permissions are formatted as 'module.action' (e.g., 'students.view', 'agents.approve')
  const requiredPermission = `${module}.${action}`;
  return user.permissions?.includes(requiredPermission) || false;
}
