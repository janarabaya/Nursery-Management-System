import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types/auth';

interface User {
  email: string;
  role?: UserRole;
  roles?: UserRole[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for user in localStorage
    const mockUser = localStorage.getItem('mockUser');
    const authToken = localStorage.getItem('authToken');
    
    if (mockUser) {
      try {
        const userData = JSON.parse(mockUser);
        const role = userData.role as UserRole;
        setUser({
          email: userData.email,
          role: role,
          roles: userData.roles || (role ? [role] : []),
        });
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    } else if (authToken) {
      // If we have a token but no mock user, try to decode it
      // In a real app, you'd verify the token with the backend
      setUser({ email: 'user@example.com', role: 'customer', roles: ['customer'] });
    }
    
    setIsLoading(false);
  }, []);

  return { user, isLoading };
}

// Check if roles match (handles both agriculture_engineer and agricultural_engineer variants)
function rolesMatch(userRole: string | UserRole, requiredRole: string | UserRole): boolean {
  if (userRole === requiredRole) return true;
  // Handle agriculture_engineer vs agricultural_engineer mismatch
  if ((userRole === 'agriculture_engineer' || userRole === 'agricultural_engineer') &&
      (requiredRole === 'agriculture_engineer' || requiredRole === 'agricultural_engineer')) {
    return true;
  }
  return false;
}

export function useRequireRole(requiredRole: UserRole | UserRole[]) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/register');
        return;
      }

      const userRoles = user.roles || (user.role ? [user.role] : []);
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const hasAccess = allowedRoles.some(reqRole => 
        userRoles.some(userRole => rolesMatch(userRole as string, reqRole as string))
      );
      
      if (!hasAccess) {
        navigate('/access-denied');
      }
    }
  }, [user, isLoading, requiredRole, navigate]);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasAccess = !isLoading && user && allowedRoles.some(reqRole => 
    userRoles.some(userRole => rolesMatch(userRole as string, reqRole as string))
  );

  return { user, isLoading, hasAccess: hasAccess || false };
}

