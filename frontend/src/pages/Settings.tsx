import { useState, useEffect } from 'react';
import { useRequireRole } from '../utils/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { API_BASE_URL } from '../config/api';
import './Settings.css';

interface ManagerProfile {
  full_name: string;
  email: string;
  phone: string;
}

interface NurserySettings {
  name: string;
  location: string;
  working_hours_start: string;
  working_hours_end: string;
  working_days: string[];
}

interface SystemSettings {
  email_notifications: boolean;
  low_stock_alerts: boolean;
  order_notifications: boolean;
  report_frequency: string;
  theme: string;
  language: string;
}

type SettingsTab = 'password' | 'profile' | 'permissions' | 'nursery' | 'system';

export function Settings() {
  const { user, isLoading, hasAccess } = useRequireRole('manager');
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>('password');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Manager profile
  const [profileData, setProfileData] = useState<ManagerProfile>({
    full_name: '',
    email: '',
    phone: '',
  });

  // User permissions (for managing other users)
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('customer');
  const [users, setUsers] = useState<Array<{ 
    id: string; 
    name: string; 
    email: string; 
    role: string;
    type?: 'employee' | 'customer' | 'agricultural_engineer' | 'delivery_company' | 'supplier';
    permissions?: string[];
  }>>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  // Available permissions
  const availablePermissions = {
    employee: [
      'View Plants',
      'Update Inventory',
      'View Orders',
      'Record Plant Growth',
      'Update Plant Health',
      'Manage Watering',
      'Manage Fertilization',
      'Add Inspection Notes',
      'View Reports',
    ],
    agricultural_engineer: [
      'View All Plants',
      'Manage Plant Health',
      'Approve Planting Cycles',
      'Review Growth Plans',
      'Manage Growth Conditions',
      'View Reports',
      'Manage Inspections',
      'Approve Fertilization Plans',
    ],
    customer: [
      'View Products',
      'Place Orders',
      'View Own Orders',
      'Cancel Own Orders',
      'Add to Favorites',
      'View Cart',
      'Submit Feedback',
    ],
    delivery_company: [
      'View Assigned Orders',
      'Update Order Progress',
      'View Delivery Routes',
      'Mark as Delivered',
      'View Customer Addresses',
    ],
    supplier: [
      'View Orders',
      'Update Order Progress',
      'View Inventory Requests',
      'Submit Delivery Dates',
      'View Payment Information',
    ],
  };

  // Nursery settings
  const [nurserySettings, setNurserySettings] = useState<NurserySettings>({
    name: 'Green Paradise Nursery',
    location: 'Ramallah, Palestine',
    working_hours_start: '08:00',
    working_hours_end: '18:00',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  });

  // System settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    email_notifications: true,
    low_stock_alerts: true,
    order_notifications: true,
    report_frequency: 'weekly',
    theme: theme,
    language: language,
  });

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchProfile();
      fetchNurserySettings();
      fetchSystemSettings();
      fetchUsers();
    }
  }, [isLoading, hasAccess]);

  useEffect(() => {
    setSystemSettings(prev => ({ ...prev, theme }));
  }, [theme]);

  useEffect(() => {
    setSystemSettings(prev => ({ ...prev, language }));
  }, [language]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const mockUser = localStorage.getItem('mockUser');
      
      if (mockUser) {
        const userData = JSON.parse(mockUser);
        setProfileData({
          full_name: userData.full_name || 'Manager',
          email: userData.email || '',
          phone: userData.phone || '',
        });
      } else {
        // Try to fetch from API
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchNurserySettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/settings/nursery`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNurserySettings(data);
      } else {
        // Use default settings
      }
    } catch (error) {
      console.error('Error fetching nursery settings:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/settings/system`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSystemSettings(data);
      } else {
        // Use default settings
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch all types of users
      const [employeesRes, customersRes, engineersRes, deliveryRes, suppliersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employees`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/customers`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/users?role=agricultural_engineer`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/delivery-companies`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/suppliers`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const allUsers: Array<{ 
        id: string; 
        name: string; 
        email: string; 
        role: string;
        type?: 'employee' | 'customer' | 'agricultural_engineer' | 'delivery_company' | 'supplier';
        permissions?: string[];
      }> = [];

      // Process employees
      if (employeesRes.ok) {
        const employees = await employeesRes.json();
        employees.forEach((emp: any) => {
          allUsers.push({
            id: emp.user_id || emp.id,
            name: emp.user?.full_name || emp.full_name || emp.name || 'Employee',
            email: emp.user?.email || emp.email || '',
            role: emp.role || 'employee',
            type: 'employee',
            permissions: emp.permissions || [],
          });
        });
      }

      // Process customers
      if (customersRes.ok) {
        const customers = await customersRes.json();
        customers.forEach((cust: any) => {
          allUsers.push({
            id: cust.user_id || cust.id,
            name: cust.user?.full_name || cust.full_name || cust.name || 'Customer',
            email: cust.user?.email || cust.email || '',
            role: 'customer',
            type: 'customer',
            permissions: cust.permissions || [],
          });
        });
      }

      // Process agricultural engineers
      if (engineersRes.ok) {
        const engineers = await engineersRes.json();
        engineers.forEach((eng: any) => {
          allUsers.push({
            id: eng.id || eng.user_id,
            name: eng.full_name || eng.name || 'Agricultural Engineer',
            email: eng.email || '',
            role: 'agricultural_engineer',
            type: 'agricultural_engineer',
            permissions: eng.permissions || [],
          });
        });
      }

      // Process delivery companies
      if (deliveryRes.ok) {
        const deliveries = await deliveryRes.json();
        deliveries.forEach((del: any) => {
          allUsers.push({
            id: del.id || del.user_id,
            name: del.company_name || del.name || 'Delivery Company',
            email: del.email || del.contact_email || '',
            role: 'delivery',
            type: 'delivery_company',
            permissions: del.permissions || [],
          });
        });
      }

      // Process suppliers
      if (suppliersRes.ok) {
        const suppliers = await suppliersRes.json();
        suppliers.forEach((sup: any) => {
          allUsers.push({
            id: sup.id || sup.user_id,
            name: sup.company_name || sup.name || 'Supplier',
            email: sup.email || sup.contact_email || '',
            role: 'supplier',
            type: 'supplier',
            permissions: sup.permissions || [],
          });
        });
      }

      if (allUsers.length > 0) {
        setUsers(allUsers);
      } else {
        // Mock data for demo
        setUsers([
          { id: '1', name: 'Ahmed Ali', email: 'ahmed@example.com', role: 'customer', type: 'customer', permissions: [] },
          { id: '2', name: 'Sara Mohammed', email: 'sara@example.com', role: 'employee', type: 'employee', permissions: [] },
          { id: '3', name: 'Dr. Omar Hassan', email: 'omar@example.com', role: 'agricultural_engineer', type: 'agricultural_engineer', permissions: [] },
          { id: '4', name: 'Fast Delivery Co.', email: 'delivery@example.com', role: 'delivery', type: 'delivery_company', permissions: [] },
          { id: '5', name: 'Green Supplies Ltd.', email: 'supplier@example.com', role: 'supplier', type: 'supplier', permissions: [] },
        ]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Mock data on error
      setUsers([
        { id: '1', name: 'Ahmed Ali', email: 'ahmed@example.com', role: 'customer', type: 'customer', permissions: [] },
        { id: '2', name: 'Sara Mohammed', email: 'sara@example.com', role: 'employee', type: 'employee', permissions: [] },
        { id: '3', name: 'Dr. Omar Hassan', email: 'omar@example.com', role: 'agricultural_engineer', type: 'agricultural_engineer', permissions: [] },
        { id: '4', name: 'Fast Delivery Co.', email: 'delivery@example.com', role: 'delivery', type: 'delivery_company', permissions: [] },
        { id: '5', name: 'Green Supplies Ltd.', email: 'supplier@example.com', role: 'supplier', type: 'supplier', permissions: [] },
      ]);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to change password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        fetchProfile();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUserRoleUpdate = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/users/${selectedUser}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: userRole }),
      });

      if (response.ok) {
        setSuccess('User role updated successfully!');
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update user role');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user role. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    if (userPermissions.includes(permission)) {
      setUserPermissions(userPermissions.filter(p => p !== permission));
    } else {
      setUserPermissions([...userPermissions, permission]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/users/${selectedUser}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: userPermissions }),
      });

      if (response.ok) {
        setSuccess('User permissions updated successfully!');
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update permissions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNurserySettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/settings/nursery`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nurserySettings),
      });

      if (response.ok) {
        setSuccess('Nursery settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update nursery settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update nursery settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSystemSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/settings/system`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemSettings),
      });

      if (response.ok) {
        setSuccess('System settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update system settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update system settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkingDayToggle = (day: string) => {
    setNurserySettings(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }));
  };

  if (isLoading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="settings">
      <div className="settings-content">
        <header className="settings-header">
          <div className="header-left">
            <h1>{t('settings.title')}</h1>
            <p className="welcome-text">{t('settings.subtitle')}</p>
          </div>
        </header>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            {t('settings.password')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {t('settings.profile')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            {t('settings.permissions')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'nursery' ? 'active' : ''}`}
            onClick={() => setActiveTab('nursery')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            {t('settings.nursery')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
            </svg>
            {t('settings.system')}
          </button>
        </div>

        <div className="settings-panel">
          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h2>{t('settings.password')}</h2>
              </div>
              <form className="settings-form" onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label htmlFor="currentPassword">{t('password.current')} *</label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    placeholder={t('password.placeholder.current')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newPassword">{t('password.new')} *</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={8}
                    placeholder={t('password.placeholder.new')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">{t('password.confirm')} *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength={8}
                    placeholder={t('password.placeholder.confirm')}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? (language === 'ar' ? 'جاري التغيير...' : 'Changing...') : t('password.change')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Manager Profile Tab */}
          {activeTab === 'profile' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h2>{t('settings.profile')}</h2>
              </div>
              <form className="settings-form" onSubmit={handleProfileUpdate}>
                <div className="form-group">
                  <label htmlFor="full_name">{t('profile.fullName')} *</label>
                  <input
                    type="text"
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    required
                    placeholder={t('profile.placeholder.name')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">{t('profile.email')} *</label>
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    required
                    placeholder={t('profile.placeholder.email')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">{t('profile.phone')}</label>
                  <input
                    type="tel"
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder={t('profile.placeholder.phone')}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('profile.save')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <h2>{t('permissions.title')}</h2>
              </div>
              <div className="permissions-form">
                <div className="form-group">
                  <label htmlFor="selectedUser">{t('permissions.selectUser')}</label>
                  <select
                    id="selectedUser"
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      const user = users.find(u => u.id === e.target.value);
                      if (user) {
                        setUserRole(user.role);
                        setUserPermissions(user.permissions || []);
                      }
                    }}
                  >
                    <option value="">-- Select a user --</option>
                    {/* Group by type */}
                    <optgroup label={language === 'ar' ? '👥 الموظفين' : '👥 Employees'}>
                      {users.filter(u => u.type === 'employee').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={language === 'ar' ? '🌾 المهندسين الزراعيين' : '🌾 Agricultural Engineers'}>
                      {users.filter(u => u.type === 'agricultural_engineer').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={language === 'ar' ? '🛒 الزبائن' : '🛒 Customers'}>
                      {users.filter(u => u.type === 'customer').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={language === 'ar' ? '🚚 شركات التوصيل' : '🚚 Delivery Companies'}>
                      {users.filter(u => u.type === 'delivery_company').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={language === 'ar' ? '📦 المزودين' : '📦 Suppliers'}>
                      {users.filter(u => u.type === 'supplier').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                {selectedUser && (() => {
                  const selectedUserData = users.find(u => u.id === selectedUser);
                  const userType = selectedUserData?.type || 'employee';
                  const permissionsForType = availablePermissions[userType as keyof typeof availablePermissions] || [];
                  
                  return (
                    <>
                      <div className="user-info-card">
                        <h3>{selectedUserData?.name}</h3>
                        <p><strong>Email:</strong> {selectedUserData?.email}</p>
                        <p><strong>Type:</strong> {
                          userType === 'employee' ? '👥 Employee' :
                          userType === 'agricultural_engineer' ? '🌾 Agricultural Engineer' :
                          userType === 'customer' ? '🛒 Customer' :
                          userType === 'delivery_company' ? '🚚 Delivery Company' :
                          '📦 Supplier'
                        }</p>
                        <p><strong>Current Role:</strong> {selectedUserData?.role}</p>
                      </div>

                    <div className="form-group">
                      <label htmlFor="userRole">{t('permissions.assignRole')}</label>
                      <select
                        id="userRole"
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value)}
                      >
                        <option value="customer">{t('role.customer')}</option>
                        <option value="employee">{t('role.employee')}</option>
                        <option value="nursery_worker">{t('role.nursery_worker')}</option>
                        <option value="delivery">{t('role.delivery')}</option>
                        <option value="accountant">{t('role.accountant')}</option>
                        <option value="agricultural_engineer">{t('role.agricultural_engineer')}</option>
                        <option value="manager">{t('role.manager')}</option>
                      </select>
                      </div>

                      <div className="permissions-section">
                        <h3>{t('permissions.userPermissions')}</h3>
                        <p className="permissions-description">
                          {t('permissions.description')}
                        </p>
                        <div className="permissions-grid">
                          {permissionsForType.map(permission => (
                            <label key={permission} className="permission-checkbox">
                              <input
                                type="checkbox"
                                checked={userPermissions.includes(permission)}
                                onChange={() => handlePermissionToggle(permission)}
                              />
                              <span className="checkmark"></span>
                              <span className="permission-label">{permission}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="form-actions">
                        <button type="button" className="save-btn" onClick={handleUserRoleUpdate} disabled={saving}>
                          {saving ? (language === 'ar' ? 'جاري التحديث...' : 'Updating...') : t('permissions.updateRole')}
                        </button>
                        <button type="button" className="save-btn" onClick={handleSavePermissions} disabled={saving}>
                          {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('permissions.savePermissions')}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Nursery Settings Tab */}
          {activeTab === 'nursery' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                  </svg>
                </div>
                <h2>{t('settings.nursery')}</h2>
              </div>
              <form className="settings-form" onSubmit={handleNurserySettingsUpdate}>
                <div className="form-group">
                  <label htmlFor="nurseryName">{t('nursery.name')} *</label>
                  <input
                    type="text"
                    id="nurseryName"
                    value={nurserySettings.name}
                    onChange={(e) => setNurserySettings({ ...nurserySettings, name: e.target.value })}
                    required
                    placeholder={language === 'ar' ? 'أدخل اسم المشتل' : 'Enter nursery name'}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nurseryLocation">{t('nursery.location')} *</label>
                  <input
                    type="text"
                    id="nurseryLocation"
                    value={nurserySettings.location}
                    onChange={(e) => setNurserySettings({ ...nurserySettings, location: e.target.value })}
                    required
                    placeholder={language === 'ar' ? 'أدخل موقع المشتل' : 'Enter nursery location'}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="workingHoursStart">{t('nursery.workingHoursStart')} *</label>
                    <input
                      type="time"
                      id="workingHoursStart"
                      value={nurserySettings.working_hours_start}
                      onChange={(e) => setNurserySettings({ ...nurserySettings, working_hours_start: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="workingHoursEnd">{t('nursery.workingHoursEnd')} *</label>
                    <input
                      type="time"
                      id="workingHoursEnd"
                      value={nurserySettings.working_hours_end}
                      onChange={(e) => setNurserySettings({ ...nurserySettings, working_hours_end: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('nursery.workingDays')} *</label>
                  <div className="working-days-grid">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <label key={day} className="day-checkbox">
                        <input
                          type="checkbox"
                          checked={nurserySettings.working_days.includes(day)}
                          onChange={() => handleWorkingDayToggle(day)}
                        />
                        <span>{t(`day.${day}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('nursery.save')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
                  </svg>
                </div>
                <h2>{t('settings.system')}</h2>
              </div>
              <form className="settings-form" onSubmit={handleSystemSettingsUpdate}>
                <div className="settings-checkboxes">
                  <div className="setting-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={systemSettings.email_notifications}
                        onChange={(e) => setSystemSettings({ ...systemSettings, email_notifications: e.target.checked })}
                      />
                      {t('system.emailNotifications')}
                    </label>
                  </div>
                  <div className="setting-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={systemSettings.low_stock_alerts}
                        onChange={(e) => setSystemSettings({ ...systemSettings, low_stock_alerts: e.target.checked })}
                      />
                      {t('system.lowStockAlerts')}
                    </label>
                  </div>
                  <div className="setting-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={systemSettings.order_notifications}
                        onChange={(e) => setSystemSettings({ ...systemSettings, order_notifications: e.target.checked })}
                      />
                      {t('system.orderNotifications')}
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="reportFrequency">{t('system.reportFrequency')}</label>
                  <select
                    id="reportFrequency"
                    value={systemSettings.report_frequency}
                    onChange={(e) => setSystemSettings({ ...systemSettings, report_frequency: e.target.value })}
                  >
                    <option value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</option>
                    <option value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                    <option value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="theme">{t('settings.theme')}</label>
                  <select
                    id="theme"
                    value={theme}
                    onChange={(e) => {
                      const newTheme = e.target.value as 'light' | 'dark' | 'auto';
                      console.log('Theme changed to:', newTheme);
                      setTheme(newTheme);
                      setSystemSettings({ ...systemSettings, theme: newTheme });
                      // Force immediate update
                      setTimeout(() => {
                        const html = document.documentElement;
                        const body = document.body;
                        if (newTheme === 'dark') {
                          html.classList.add('dark-mode');
                          body.classList.add('dark-mode');
                          html.setAttribute('data-theme', 'dark');
                          body.setAttribute('data-theme', 'dark');
                        } else {
                          html.classList.remove('dark-mode');
                          body.classList.remove('dark-mode');
                          html.setAttribute('data-theme', 'light');
                          body.setAttribute('data-theme', 'light');
                        }
                      }, 0);
                    }}
                  >
                    <option value="light">{language === 'ar' ? 'فاتح' : 'Light'}</option>
                    <option value="dark">{language === 'ar' ? 'داكن' : 'Dark'}</option>
                    <option value="auto">{language === 'ar' ? 'تلقائي' : 'Auto'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="language">{t('settings.language')}</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => {
                      const newLanguage = e.target.value as 'en' | 'ar';
                      setLanguage(newLanguage);
                      setSystemSettings({ ...systemSettings, language: newLanguage });
                    }}
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('settings.save')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

