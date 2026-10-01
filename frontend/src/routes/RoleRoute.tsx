import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../features/auth/auth.context';
import type { UserRole } from '../features/auth/auth.types';
import { getRoleHomePath } from './role-paths';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  return <Outlet />;
}