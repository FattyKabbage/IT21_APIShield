import { Navigate } from 'react-router';
import { useAuth } from '../features/auth/auth.context';
import { getRoleHomePath } from './role-paths';

export function RoleHomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHomePath(user.role)} replace />;
}