import { useRequireRole } from '../utils/useAuth';
import './ManagerOnly.css';

export function ManagerOnly() {
  const { user, isLoading, hasAccess } = useRequireRole('manager');

  if (isLoading) {
    return (
      <div className="manager-only-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // ProtectedRoute will handle redirect
  }

  return (
    <div className="manager-only-page">
      <div className="manager-only-content">
        <header className="page-header">
          <h1>Manager Only Page</h1>
          <p className="welcome-text">Welcome, {user?.email || 'Manager'}</p>
        </header>

        <div className="page-content">
          <div className="info-card">
            <div className="info-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h2>Protected Manager Page</h2>
            <p>This page is only accessible to users with the Manager role.</p>
            <p>Your current role: <strong>{user?.role || 'Manager'}</strong></p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <h3>Feature 1</h3>
              <p>Add your manager-specific features here</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </div>
              <h3>Feature 2</h3>
              <p>Add your manager-specific features here</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3>Feature 3</h3>
              <p>Add your manager-specific features here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





