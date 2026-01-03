import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import { UserRole } from '../types/auth';
import { AccessDenied } from '../pages/AccessDenied';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: UserRole | UserRole[];
  fallback?: 'denied' | 'home' | 'register';
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback = 'denied' 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f5f7fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #107a48',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: '#666' }}>Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to register
  if (!user) {
    return <Navigate to="/register" replace />;
  }

  // Check if roles match (handles both agriculture_engineer and agricultural_engineer variants)
  const rolesMatch = (userRole: string | UserRole, requiredRole: string | UserRole): boolean => {
    if (userRole === requiredRole) return true;
    // Handle agriculture_engineer vs agricultural_engineer mismatch
    if ((userRole === 'agriculture_engineer' || userRole === 'agricultural_engineer') &&
        (requiredRole === 'agriculture_engineer' || requiredRole === 'agricultural_engineer')) {
      return true;
    }
    return false;
  };

  // Check if user has the required role(s)
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasAccess = allowedRoles.some(reqRole => 
    userRoles.some(userRole => rolesMatch(userRole as string, reqRole as string))
  );

  if (!hasAccess) {
    if (fallback === 'denied') {
      return <AccessDenied />;
    } else if (fallback === 'home') {
      return <Navigate to="/home" replace />;
    } else {
      return <Navigate to="/register" replace />;
    }
  }

  return <>{children}</>;
}

