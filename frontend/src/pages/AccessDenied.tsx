import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import './AccessDenied.css';

export function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="access-denied">
      <div className="access-denied-container">
        <div className="access-denied-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h1>Access Denied</h1>
        <p className="access-denied-message">
          You don't have permission to access this page.
        </p>
        <p className="access-denied-details">
          You don't have the required permissions to access this page.
          {user && (
            <span className="current-role">
              Your current role: <strong>{user.role || 'None'}</strong>
            </span>
          )}
        </p>
        <div className="access-denied-actions">
          <button className="go-home-btn" onClick={() => navigate('/home')}>
            Go to Home
          </button>
          <button className="go-back-btn" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}






