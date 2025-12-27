import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Check if there's a mock user from registration
      const mockUser = localStorage.getItem('mockUser');
      const mockToken = localStorage.getItem('authToken');
      
      if (mockUser && mockToken) {
        const user = JSON.parse(mockUser);
        // If email matches mock user, allow login
        if (user.email === email) {
          // Navigate based on role
          if (user.role === 'manager') {
            navigate('/manager-dashboard');
          } else if (user.role === 'employee') {
            navigate('/employee-dashboard');
          } else if (user.role === 'agricultural_engineer') {
            navigate('/agricultural-engineer-dashboard');
          } else if (user.role === 'supplier') {
            navigate('/supplier-dashboard');
          } else if (user.role === 'delivery_company' || user.role === 'shippment_company') {
            navigate('/delivery-company-dashboard');
          } else {
            navigate('/home');
          }
          return;
        }
      }

      // Try to call backend login endpoint
      const backendUrl = 'http://localhost:5000';
      let response: Response;
      
      try {
        // Try proxy first
        response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        // If 404, try direct backend
        if (response.status === 404) {
          response = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });
        }
      } catch (fetchError) {
        // Backend not available - check for mock user
        if (mockUser) {
          const user = JSON.parse(mockUser);
          if (user.email === email) {
            // Navigate based on role
            if (user.role === 'manager') {
              navigate('/manager-dashboard');
            } else if (user.role === 'employee') {
              navigate('/employee-dashboard');
            } else {
              navigate('/home');
            }
            return;
          }
        }
        throw new Error('Cannot connect to server. Please make sure the backend is running.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store token if provided
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // Store user data if provided
      if (data.user) {
        localStorage.setItem('mockUser', JSON.stringify(data.user));
      }

      // Navigate based on role
      const userRole = data.user?.roles?.[0] || data.user?.role || 'customer';
      if (userRole === 'manager') {
        navigate('/manager-dashboard');
      } else if (userRole === 'employee') {
        navigate('/employee-dashboard');
      } else if (userRole === 'agricultural_engineer') {
        navigate('/agricultural-engineer-dashboard');
      } else if (userRole === 'supplier') {
        navigate('/supplier-dashboard');
      } else if (userRole === 'delivery_company' || userRole === 'shippment_company') {
        navigate('/delivery-company-dashboard');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login</h2>
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffe6e6', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      <form onSubmit={submit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#107a48',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p>
          Don't have an account?{' '}
          <a href="/register" style={{ color: '#107a48' }}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}


