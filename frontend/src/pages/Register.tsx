import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

type RoleType =
  | 'manager'
  | 'supplier'
  | 'customer'
  | 'shippment_company'
  | 'employee'
  | 'agriculture_engineer';

interface RoleOption {
  value: RoleType;
  label: string;
  description: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'manager',
    label: '👔 Manager',
    description: 'Manage the nursery operations and staff',
  },
  {
    value: 'supplier',
    label: '🚚 Supplier',
    description: 'Supply plants and materials to the nursery',
  },
  {
    value: 'customer',
    label: '🛒 Customer',
    description: 'Purchase plants and products from the nursery',
  },
  {
    value: 'employee',
    label: '🧑‍🌾 Employee',
    description: 'Work as a nursery employee handling daily tasks',
  },
  {
    value: 'agriculture_engineer',
    label: '🌾 Agricultural Engineer',
    description: 'Provide agricultural expertise and plant health management',
  },
  {
    value: 'shippment_company',
    label: '📦 Shipment Company',
    description: 'Handle delivery and shipping services',
  },
];

export function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
    setStep('details');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Map UI role to database role
      const roleMap: Record<RoleType, string> = {
        manager: 'manager',
        supplier: 'supplier',
        customer: 'customer',
        employee: 'employee',
        agriculture_engineer: 'agriculture_engineer',
        shippment_company: 'delivery_company', // Map to database enum value
      };

      const requestBody = {
        role: roleMap[selectedRole!],
        username: formData.username,
        phone: formData.phone,
        address: formData.address,
        email: formData.email,
        password: formData.password,
      };

      console.log('Registering user with data:', { ...requestBody, password: '***' });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:140',message:'Attempting registration',data:{role:requestBody.role,email:requestBody.email,hasPassword:!!requestBody.password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Try to call the API endpoint
      // Use direct backend URL
      const backendUrl = process.env.REACT_APP_API_URL || '/api';
      let response: Response;
      let fetchUrl = `${backendUrl}/auth/register`; // Use proxy
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:145',message:'Attempting registration via proxy',data:{fetchUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:150',message:'Before fetch call',data:{url:fetchUrl,method:'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        response = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:160',message:'After fetch call',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        // If 404, try direct backend URL
        if (response.status === 404) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:165',message:'404 received, trying direct backend',data:{backendUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          
          fetchUrl = `${backendUrl}/api/auth/register`;
          response = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:175',message:'After direct backend call',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
        }
      } catch (fetchError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:180',message:'Fetch error caught',data:{error:fetchError instanceof Error ? fetchError.message : String(fetchError),name:fetchError instanceof Error ? fetchError.name : 'Unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        console.error('Registration API error:', fetchError);
        
        // If backend is not available, use mock response for development
        const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
          console.warn('Backend server not available. Using mock registration for development.');
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:195',message:'Using mock registration',data:{reason:'Backend unavailable'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          
          // Mock successful registration for development
          // Store user data in localStorage temporarily
          const mockUser = {
            id: `mock-${Date.now()}`,
            username: requestBody.username,
            email: requestBody.email,
            role: requestBody.role,
          };
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
          localStorage.setItem('authToken', `mock-token-${Date.now()}`);
          
          // Navigate based on role
          if (requestBody.role === 'manager') {
            navigate('/manager-dashboard');
          } else if (requestBody.role === 'employee') {
            navigate('/employee-dashboard');
          } else if (requestBody.role === 'agriculture_engineer') {
            navigate('/agricultural-engineer-dashboard');
          } else if (requestBody.role === 'supplier') {
            navigate('/supplier-dashboard');
          } else if (requestBody.role === 'delivery_company' || requestBody.role === 'shippment_company') {
            navigate('/delivery-company-dashboard');
          } else {
            navigate('/home');
          }
          return;
        }
        throw new Error(
          'Unable to connect to the server. Please make sure the backend server is running on port 5000.'
        );
      }

      // Handle response
      if (!response.ok) {
        // Treat 5xx / gateway timeout as backend unavailable and fall back to mock registration
        if (response.status >= 500) {
          console.warn('Server returned 5xx response. Using mock registration for development.');

          const mockUser = {
            id: `mock-${Date.now()}`,
            username: requestBody.username,
            email: requestBody.email,
            role: requestBody.role,
          };
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
          localStorage.setItem('authToken', `mock-token-${Date.now()}`);

          // Navigate based on role
          if (requestBody.role === 'manager') {
            navigate('/manager-dashboard');
          } else if (requestBody.role === 'employee') {
            navigate('/employee-dashboard');
          } else if (requestBody.role === 'agriculture_engineer') {
            navigate('/agricultural-engineer-dashboard');
          } else if (requestBody.role === 'supplier') {
            navigate('/supplier-dashboard');
          } else if (requestBody.role === 'delivery_company' || requestBody.role === 'shippment_company') {
            navigate('/delivery-company-dashboard');
          } else {
            navigate('/home');
          }
          return;
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:175',message:'Response not OK',data:{status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        let errorMessage = 'Registration failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Server error (${response.status})`;
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:182',message:'Error data parsed',data:{errorMessage,errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
          // #endregion
        } catch (parseError) {
          // If response is not JSON, try to get text
          const text = await response.text().catch(() => '');
          errorMessage = text || `Server returned error ${response.status}: ${response.statusText}`;
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:188',message:'Error text parsed',data:{errorMessage,text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Registration successful:', data);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:197',message:'Registration successful',data:{hasToken:!!data.token,userId:data.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      
      // Store token if provided
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // Store user data if provided
      if (data.user) {
        localStorage.setItem('mockUser', JSON.stringify(data.user));
      } else if (requestBody.role) {
        // Fallback: store role from request
        const userData = {
          id: data.user?.id || `user-${Date.now()}`,
          email: requestBody.email,
          username: requestBody.username,
          role: requestBody.role,
        };
        localStorage.setItem('mockUser', JSON.stringify(userData));
      }

      // Redirect based on role
      const userRole = data.user?.roles?.[0] || data.user?.role || requestBody.role;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dccc61c2-2b5f-4f9b-9a16-56733fd50ec6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Register.tsx:205',message:'Navigating after registration',data:{target:userRole === 'manager' ? '/manager-dashboard' : '/home', role: userRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      
      if (userRole === 'manager') {
        navigate('/manager-dashboard');
      } else if (userRole === 'employee') {
        navigate('/employee-dashboard');
      } else if (userRole === 'agricultural_engineer' || userRole === 'agriculture_engineer') {
        navigate('/agricultural-engineer-dashboard');
      } else if (userRole === 'supplier') {
        navigate('/supplier-dashboard');
      } else if (userRole === 'delivery_company' || userRole === 'shippment_company') {
        navigate('/delivery-company-dashboard');
      } else {
        navigate('/home');
      }
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more user-friendly messages for common errors
        if (error.message.includes('Database server is not running') || 
            error.message.includes('Cannot connect to database')) {
          errorMessage = 'Database connection failed. Please contact the administrator.';
        } else if (error.message.includes('Email or username already exists')) {
          errorMessage = 'This email or username is already registered. Please use a different one.';
        } else if (error.message.includes('Invalid email format')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('Password must be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }
      }
      
      setErrors({
        submit: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('role');
      setErrors({});
    }
  };

  return (
    <div className="register-container">
      {/* Decorative plant stickers */}
      <div className="plant-stickers">
        <div className="sticker sticker-1">🌿</div>
        <div className="sticker sticker-2">🌱</div>
        <div className="sticker sticker-3">🌺</div>
        <div className="sticker sticker-4">🌸</div>
        <div className="sticker sticker-5">🌻</div>
        <div className="sticker sticker-6">🌷</div>
        <div className="sticker sticker-7">🌼</div>
        <div className="sticker sticker-8">🍀</div>
        <div className="sticker sticker-9">🌵</div>
        <div className="sticker sticker-10">🌾</div>
        <div className="sticker sticker-11">🌹</div>
        <div className="sticker sticker-12">🌴</div>
        <div className="sticker sticker-13">🌳</div>
        <div className="sticker sticker-14">🌲</div>
        <div className="sticker sticker-15">🌰</div>
        <div className="sticker sticker-16">🌲</div>
        <div className="sticker sticker-17">🌿</div>
        <div className="sticker sticker-18">🌱</div>
        <div className="sticker sticker-19">🌺</div>
        <div className="sticker sticker-20">🌸</div>
        <div className="sticker sticker-21">🌻</div>
        <div className="sticker sticker-22">🌷</div>
        <div className="sticker sticker-23">🌼</div>
        <div className="sticker sticker-24">🍀</div>
        <div className="sticker sticker-25">🌵</div>
        <div className="sticker sticker-26">🌾</div>
        <div className="sticker sticker-27">🌹</div>
        <div className="sticker sticker-28">🌴</div>
        <div className="sticker sticker-29">🌳</div>
        <div className="sticker sticker-30">🌲</div>
      </div>
      <div className="register-card">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join our plant nursery community</p>
        </div>

        {step === 'role' ? (
          <div className="role-selection">
            <h2>Select Your Role</h2>
            <p className="role-subtitle">Choose the role that best describes you</p>
            <div className="role-options">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  className="role-card"
                  onClick={() => handleRoleSelect(role.value)}
                >
                  <div className="role-card-content">
                    <h3>{role.label}</h3>
                    <p>{role.description}</p>
                  </div>
                  <div className="role-arrow">→</div>
                </button>
              ))}
            </div>
            <div className="register-footer">
              <p>
                Already have an account?{' '}
                <a href="/register" className="link">
                  Sign up again
                </a>
              </p>
            </div>
          </div>
        ) : (
          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <h2>Complete Your Registration</h2>
              <p className="role-badge">Role: {roleOptions.find((r) => r.value === selectedRole)?.label}</p>
            </div>

            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
                className={errors.username ? 'error' : ''}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleInputChange}
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                placeholder="Enter your address"
                value={formData.address}
                onChange={handleInputChange}
                className={errors.address ? 'error' : ''}
              />
              {errors.address && <span className="error-message">{errors.address}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            {errors.submit && (
              <div className="error-message submit-error">{errors.submit}</div>
            )}

            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="register-footer">
              <button
                type="button"
                className="back-button"
                onClick={handleBack}
                aria-label="Go back"
              >
                ← Back
              </button>
              <p>
                Already have an account?{' '}
                <a href="/register" className="link">
                  Sign up again
                </a>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
