import type { UserRole } from '../features/auth/auth.types';

const roleHomePaths: Record<UserRole, string> = {
  SYSTEM_ADMIN: '/admin',
  ORGANIZATION: '/dashboard',
  DEVELOPER: '/developer',
};

export function getRoleHomePath(role: UserRole) {
  return roleHomePaths[role];
}