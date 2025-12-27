import { UserRole } from '../types/auth';

interface User {
  role?: UserRole;
  roles?: UserRole[];
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: User | null, requiredRole: UserRole): boolean {
  if (!user) return false;
  const userRoles = user.roles || (user.role ? [user.role] : []);
  return userRoles.includes(requiredRole);
}

/**
 * Check if a user is a manager
 */
export function isManager(user: User | null): boolean {
  return hasRole(user, 'manager');
}

/**
 * Check if a user has any of the required roles
 */
export function hasAnyRole(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false;
  const userRoles = user.roles || (user.role ? [user.role] : []);
  return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * Check if a user has all of the required roles
 */
export function hasAllRoles(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false;
  const userRoles = user.roles || (user.role ? [user.role] : []);
  return requiredRoles.every(role => userRoles.includes(role));
}






