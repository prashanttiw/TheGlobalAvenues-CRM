import { useStore } from './useStore';

export function usePermission(module: string, action: string): boolean {
  const currentUser = useStore((state) => state.currentUser);

  if (!currentUser) {
    return false;
  }

  if (currentUser.role === 'super_admin') {
    return true;
  }

  if (currentUser.role !== 'admin') {
    return false;
  }

  // Minimal UI gating for the current phase: admin users can render module guards.
  // The backend remains the source of truth for exact permission enforcement.
  return true;
}
