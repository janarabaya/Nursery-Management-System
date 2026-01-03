import { useState, useEffect } from 'react';
import { useRequireRole } from '../utils/useAuth';
import { API_BASE_URL } from '../config/api';
import './EmployeeManagement.css';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  title?: string;
  department?: string;
  is_active: boolean;
  hired_at?: string;
  // New fields
  assignedTasks?: {
    watering?: boolean;
    fertilization?: boolean;
    inspection?: boolean;
    orderPreparation?: boolean;
    [key: string]: boolean | undefined;
  };
  workSchedule?: {
    shifts?: Array<{
      day: string;
      startTime: string;
      endTime: string;
      type: 'morning' | 'afternoon' | 'night';
    }>;
    daysOff?: string[];
    holidays?: string[];
  };
  performance?: {
    tasksCompleted?: number;
    tasksOnTime?: number;
    tasksDelayed?: number;
    rating?: 'excellent' | 'good' | 'average' | 'poor';
    notes?: string[];
  };
  completedTasks?: Array<{
    taskId: string;
    taskType: string;
    completedAt: string;
    status: 'success' | 'failed';
    notes?: string;
  }>;
  attendance?: {
    absences?: Array<{
      date: string;
      type: 'absence' | 'leave' | 'late';
      reason?: string;
    }>;
    totalAbsences?: number;
    totalLeaves?: number;
    totalLates?: number;
  };
  notes?: Array<{
    date: string;
    type: 'complaint' | 'warning' | 'violation' | 'note';
    description: string;
    resolved?: boolean;
  }>;
}

interface RolePermissions {
  [key: string]: {
    name: string;
    permissions: string[];
  };
}

type ActiveTab = 'employees' | 'task-assignment' | 'schedule' | 'performance' | 'completed-tasks' | 'attendance' | 'notes' | 'permissions';

export function EmployeeManagement() {
  const { user, isLoading, hasAccess } = useRequireRole('manager');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('employees');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    role: 'nursery_worker',
    department: '',
    phone: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    employee_id: '',
    title: '',
    description: '',
    deadline: ''
  });

  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({
    nursery_worker: {
      name: 'عامل مشتل',
      permissions: [
        'View plants',
        'Update inventory',
        'View orders',
        'Update plant health logs',
      ],
    },
    delivery: {
      name: 'موظف توصيل',
      permissions: [
        'View assigned orders',
        'Update delivery status',
        'View customer addresses',
      ],
    },
    accountant: {
      name: 'محاسب',
      permissions: [
        'View all orders',
        'View financial reports',
        'Update payment status',
        'View sales data',
      ],
    },
    employee: {
      name: 'موظف عام',
      permissions: [
        'View orders',
        'Update order progress',
      ],
    },
    agricultural_engineer: {
      name: 'مهندس زراعي',
      permissions: [
        'View all plants',
        'Update plant health',
        'View plant health logs',
        'Create plant health reports',
      ],
    },
  });

  useEffect(() => {
    // Initialize available permissions list
    const allPermissions = new Set<string>();
    Object.values(rolePermissions).forEach(role => {
      role.permissions.forEach(perm => allPermissions.add(perm));
    });
    // Add common permissions
    const commonPermissions = [
      'View plants',
      'Update inventory',
      'View orders',
      'Update order progress',
      'View assigned orders',
      'Update delivery status',
      'View customer addresses',
      'View all orders',
      'View financial reports',
      'Update payment status',
      'View sales data',
      'Update plant health',
      'View plant health logs',
      'Create plant health reports',
      'View all plants',
      'Manage employees',
      'View reports',
      'Manage inventory',
      'View customers',
    ];
    commonPermissions.forEach(perm => allPermissions.add(perm));
    setAvailablePermissions(Array.from(allPermissions).sort());
  }, []);

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchEmployees();
    }
  }, [isLoading, hasAccess]);

  // Fetch tasks when Task Assignment tab is active
  useEffect(() => {
    if (activeTab === 'task-assignment' && !isLoading && hasAccess) {
      fetchTasks();
    }
  }, [activeTab, isLoading, hasAccess]);

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setTasks(data.data);
        } else if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]);
        }
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          employee_id: taskForm.employee_id,
          title: taskForm.title,
          description: taskForm.description,
          deadline: taskForm.deadline
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task');
      }

      setSuccess('Task created successfully!');
      setTaskForm({
        employee_id: '',
        title: '',
        description: '',
        deadline: ''
      });
      setShowTaskForm(false);
      fetchTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update task status');
      }

      setSuccess('Task status updated successfully!');
      fetchTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update task status. Please try again.');
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/employees`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📥 Employees API Response:', result);
        
        // Handle both response formats: { success, data, count } or direct array
        const employeesData = result.data || result;
        
        if (Array.isArray(employeesData)) {
          const transformedEmployees = employeesData.map((emp: any) => ({
            id: String(emp.EmployeeID || emp.ID || emp.id || emp.user_id || Date.now() + Math.random()),
            full_name: emp.full_name || emp.Name || emp.FullName || emp.user?.full_name || 'Unknown',
            email: emp.email || emp.Email || emp.user?.email || '',
            phone: emp.phone || emp.Phone || emp.user?.phone || '',
            role: emp.role || emp.Role || emp.user?.roles?.[0]?.name || 'employee',
            title: emp.title || emp.Title || '',
            department: emp.department || emp.Department || '',
            is_active: emp.is_active !== false && emp.IsActive !== false && (emp.is_active !== undefined || emp.IsActive !== undefined ? (emp.is_active || emp.IsActive) : true),
            hired_at: emp.hired_at || emp.HiredAt || emp.HireDate || emp.hire_date || '',
          }));
          console.log('✅ Transformed employees:', transformedEmployees);
          setEmployees(transformedEmployees);
          setError('');
        } else {
          console.warn('⚠️ Employees data is not an array:', employeesData);
          setEmployees([]);
          setError('Invalid employees data format');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch employees:', response.status, errorData);
        setError('Failed to load employees. Please try again.');
        setEmployees([]);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      setError('Failed to load employees. Please try again.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployeeForm(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
    
    // Auto-fetch employee name when email is entered (only for new employees, not when editing)
    if (name === 'email' && value && !editingEmployee) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(value)) {
        try {
          const response = await fetch(`${API_BASE_URL}/employees/by-email/${encodeURIComponent(value)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.full_name) {
              setEmployeeForm(prev => ({ ...prev, name: data.data.full_name }));
              // Optionally fill other fields if available
              if (data.data.phone) {
                setEmployeeForm(prev => ({ ...prev, phone: data.data.phone }));
              }
              if (data.data.role) {
                setEmployeeForm(prev => ({ ...prev, role: data.data.role }));
              }
            }
          }
        } catch (error) {
          // Silently fail - employee might not exist yet, which is fine
          console.log('Employee not found or error fetching:', error);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const url = editingEmployee
        ? `${API_BASE_URL}/employees/${editingEmployee.id}`
        : `${API_BASE_URL}/employees`;

      const method = editingEmployee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: employeeForm.name,
          email: employeeForm.email,
          role: employeeForm.role,
          title: employeeForm.department || employeeForm.role,
          department: employeeForm.department,
          phone: employeeForm.phone || null,
          password: editingEmployee ? undefined : (employeeForm.password || undefined),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save employee');
      }

      setSuccess(editingEmployee ? 'Employee updated successfully!' : 'Employee added successfully!');
      setShowAddForm(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (employee: Employee) => {
    setEditingEmployee(employee);
    
    // Fetch employee name from database using email
    let employeeName = employee.full_name;
    if (employee.email && employeeName === 'Unknown') {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/employees/by-email/${encodeURIComponent(employee.email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.full_name) {
            employeeName = data.data.full_name;
          } else if (data.full_name) {
            // Handle case where data is returned directly
            employeeName = data.full_name;
          }
        }
      } catch (error) {
        console.log('Error fetching employee name:', error);
        // Use the existing full_name if fetch fails
      }
    }
    
    // If still Unknown, try to get from Employees table directly via API
    if (employeeName === 'Unknown' && employee.email) {
      try {
        const token = localStorage.getItem('authToken');
        // Try to get from the main employees list
        const response = await fetch(`${API_BASE_URL}/employees`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            const foundEmployee = data.data.find((emp: any) => emp.email === employee.email);
            if (foundEmployee && foundEmployee.full_name && foundEmployee.full_name !== 'Unknown') {
              employeeName = foundEmployee.full_name;
            }
          }
        }
      } catch (error) {
        console.log('Error fetching from employees list:', error);
      }
    }
    
    setEmployeeForm({
      name: employeeName,
      email: employee.email,
      role: employee.role,
      department: employee.department || '',
      phone: employee.phone || '',
      password: '',
    });
    setShowAddForm(true);
  };

  const handleToggleStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee status');
      }

      setSuccess(`Employee ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update employee status. Please try again.');
    }
  };

  const handleEditRolePermissions = (roleKey: string) => {
    setEditingRole(roleKey);
    setError('');
    setSuccess('');
  };

  const handleCloseRoleEdit = () => {
    setEditingRole(null);
    setError('');
    setSuccess('');
  };

  const handleTogglePermission = (permission: string) => {
    if (!editingRole) return;
    
    const currentPermissions = rolePermissions[editingRole].permissions;
    const isIncluded = currentPermissions.includes(permission);
    
    setRolePermissions(prev => ({
      ...prev,
      [editingRole]: {
        ...prev[editingRole],
        permissions: isIncluded
          ? currentPermissions.filter(p => p !== permission)
          : [...currentPermissions, permission],
      },
    }));
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/roles/${editingRole}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: rolePermissions[editingRole].permissions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role permissions');
      }

      setSuccess('Role permissions updated successfully!');
      setEditingRole(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      setSuccess('Employee deleted successfully!');
      fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete employee. Please try again.');
    }
  };

  const handleUpdateTaskAssignment = async (employeeId: string, taskType: string, assigned: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) return;

      const assignedTasks = {
        ...employee.assignedTasks,
        [taskType]: assigned,
      };

      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ assigned_tasks: assignedTasks }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task assignment');
      }

      fetchEmployees();
    } catch (err: any) {
      setError('Failed to update task assignment. Please try again.');
    }
  };

  const handleUpdateSchedule = async (employeeId: string, field: string, value: any) => {
    try {
      const token = localStorage.getItem('authToken');
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) return;

      const workSchedule = {
        ...employee.workSchedule,
        [field]: value,
      };

      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ work_schedule: workSchedule }),
      });

      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }

      fetchEmployees();
    } catch (err: any) {
      setError('Failed to update schedule. Please try again.');
    }
  };

  const handleResolveNote = async (employeeId: string, noteIndex: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const employee = employees.find(e => e.id === employeeId);
      if (!employee || !employee.notes) return;

      const updatedNotes = [...employee.notes];
      updatedNotes[noteIndex] = { ...updatedNotes[noteIndex], resolved: true };

      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: updatedNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve note');
      }

      setSuccess('Note resolved successfully!');
      fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to resolve note. Please try again.');
    }
  };

  const resetForm = () => {
    setEmployeeForm({
      name: '',
      email: '',
      role: 'nursery_worker',
      department: '',
      phone: '',
      password: '',
    });
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingEmployee(null);
    resetForm();
    setError('');
  };

  if (isLoading) {
    return (
      <div className="employee-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="employee-management">
      <div className="employee-management-content">
        <header className="employee-management-header">
          <div className="header-left">
            <h1>Employee Management</h1>
            <p className="welcome-text">Add, edit, and manage employees and their roles</p>
          </div>
          <button 
            className="add-employee-btn"
            onClick={() => {
              setShowAddForm(true);
              setEditingEmployee(null);
              resetForm();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Employee
          </button>
        </header>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        {/* Tabs */}
        <div className="employee-tabs">
          <button 
            className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            Employees Data
          </button>
          <button 
            className={`tab-btn ${activeTab === 'task-assignment' ? 'active' : ''}`}
            onClick={() => setActiveTab('task-assignment')}
          >
            Task Assignment
          </button>
          <button 
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Work Schedule
          </button>
          <button 
            className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance Tracking
          </button>
          <button 
            className={`tab-btn ${activeTab === 'completed-tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed-tasks')}
          >
            Completed Tasks
          </button>
          <button 
            className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance & Leaves
          </button>
          <button 
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes & Issues
          </button>
          <button 
            className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
        </div>

        {showAddForm && (
          <div className="add-employee-form-container">
            <div className="add-employee-form-header">
              <h2>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button className="close-form-btn" onClick={cancelForm}>×</button>
            </div>
            <form className="employee-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Employee Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={employeeForm.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={employeeForm.email}
                    onChange={handleInputChange}
                    required
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={employeeForm.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="nursery_worker">عامل مشتل (Nursery Worker)</option>
                    <option value="delivery">موظف توصيل (Delivery)</option>
                    <option value="accountant">محاسب (Accountant)</option>
                    <option value="employee">موظف عام (General Employee)</option>
                    <option value="agricultural_engineer">مهندس زراعي (Agricultural Engineer)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={employeeForm.phone}
                    onChange={handleInputChange}
                    placeholder="+970 59 123 4567"
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Password {!editingEmployee && '(Optional - default will be generated)'}</label>
                    <input
                      type="password"
                      name="password"
                      value={employeeForm.password}
                      onChange={handleInputChange}
                      placeholder="Leave empty for default password"
                    />
                  </div>
                </div>
              )}

              {rolePermissions[employeeForm.role] && (
                <div className="permissions-preview">
                  <h4>Role Permissions:</h4>
                  <div className="permissions-list">
                    {rolePermissions[employeeForm.role].permissions.map((permission, index) => (
                      <span key={index} className="permission-badge">{permission}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={cancelForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="dashboard-section">
            <div className="section-header">
              <div className="section-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h2>All Employees ({(() => {
                const filtered = employees.filter((employee) => {
                  if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const matchesSearch = 
                      employee.full_name?.toLowerCase().includes(query) ||
                      employee.email?.toLowerCase().includes(query) ||
                      employee.phone?.toLowerCase().includes(query);
                    if (!matchesSearch) return false;
                  }
                  if (filterRole !== 'all' && employee.role !== filterRole) return false;
                  if (filterStatus !== 'all') {
                    if (filterStatus === 'active' && !employee.is_active) return false;
                    if (filterStatus === 'inactive' && employee.is_active) return false;
                  }
                  return true;
                });
                return filtered.length;
              })()})</h2>
            </div>

            {/* Search and Filter Controls */}
            <div className="employees-controls" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-box" style={{ flex: '1', minWidth: '250px' }}>
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #d1fae5',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = '#d1fae5'}
                />
              </div>
              <div className="filter-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '2px solid #d1fae5',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="nursery_worker">عامل مشتل (Nursery Worker)</option>
                  <option value="delivery">موظف توصيل (Delivery)</option>
                  <option value="accountant">محاسب (Accountant)</option>
                  <option value="employee">موظف عام (General Employee)</option>
                  <option value="agricultural_engineer">مهندس زراعي (Agricultural Engineer)</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '2px solid #d1fae5',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {(searchQuery || filterRole !== 'all' || filterStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterRole('all');
                      setFilterStatus('all');
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner-small"></div>
                <p>Loading employees...</p>
              </div>
            ) : (() => {
              // Filter employees based on search and filters
              const filteredEmployees = employees.filter((employee) => {
                // Search filter
                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  const matchesSearch = 
                    employee.full_name?.toLowerCase().includes(query) ||
                    employee.email?.toLowerCase().includes(query) ||
                    employee.phone?.toLowerCase().includes(query);
                  if (!matchesSearch) return false;
                }
                
                // Role filter
                if (filterRole !== 'all' && employee.role !== filterRole) {
                  return false;
                }
                
                // Status filter
                if (filterStatus !== 'all') {
                  if (filterStatus === 'active' && !employee.is_active) return false;
                  if (filterStatus === 'inactive' && employee.is_active) return false;
                }
                
                return true;
              });

              return filteredEmployees.length === 0 ? (
                <div className="empty-state">
                  <p>No employees found matching your criteria.</p>
                </div>
              ) : (
                <div className="employees-table-container">
                  <table className="employees-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="employee-name">{employee.full_name}</td>
                        <td>{employee.email}</td>
                        <td>{employee.phone || 'N/A'}</td>
                        <td>
                          <span className="role-badge">
                            {rolePermissions[employee.role]?.name || employee.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${employee.is_active ? 'active' : 'inactive'}`}>
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(employee)}
                            title="Edit Employee"
                          >
                            Edit
                          </button>
                          <button
                            className={`toggle-status-btn ${employee.is_active ? 'deactivate' : 'activate'}`}
                            onClick={() => handleToggleStatus(employee.id, employee.is_active)}
                            title={employee.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {employee.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(employee.id)}
                            title="Delete Employee"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* Task Assignment Tab */}
        {activeTab === 'task-assignment' && (
          <div className="task-assignment-section">
            <div className="section-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Task Assignment</h2>
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                {showTaskForm ? 'Cancel' : '+ Assign New Task'}
              </button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px' }}>{success}</div>}

            {/* Task Creation Form */}
            {showTaskForm && (
              <div className="task-form-container" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '2px solid #d1fae5' }}>
                <h3 style={{ marginBottom: '1rem', color: '#047857' }}>Assign New Task</h3>
                <form onSubmit={handleCreateTask}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Employee *</label>
                      <select
                        required
                        value={taskForm.employee_id}
                        onChange={(e) => setTaskForm({ ...taskForm, employee_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #d1fae5',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      >
                        <option value="">Select Employee</option>
                        {employees.filter(e => e.is_active).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Deadline *</label>
                      <input
                        type="datetime-local"
                        required
                        value={taskForm.deadline}
                        onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #d1fae5',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Task Title *</label>
                    <input
                      type="text"
                      required
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="Enter task title"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #d1fae5',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Description</label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      placeholder="Enter task description"
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #d1fae5',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTaskForm(false);
                        setTaskForm({ employee_id: '', title: '', description: '', deadline: '' });
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        opacity: isSubmitting ? 0.6 : 1
                      }}
                    >
                      {isSubmitting ? 'Creating...' : 'Create Task'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tasks List */}
            <div className="tasks-list-container">
              <h3 style={{ marginBottom: '1rem', color: '#047857' }}>All Tasks ({tasks.length})</h3>
              {tasksLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <p>No tasks found. Create a new task to get started.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        border: '2px solid #d1fae5',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ marginBottom: '0.5rem', color: '#047857', fontSize: '1.1rem' }}>{task.title}</h4>
                          <p style={{ marginBottom: '0.5rem', color: '#64748b' }}><strong>Employee:</strong> {task.employee_name || 'Unknown'}</p>
                          {task.description && (
                            <p style={{ marginBottom: '0.5rem', color: '#64748b' }}>{task.description}</p>
                          )}
                          <p style={{ marginBottom: '0.5rem', color: '#64748b' }}>
                            <strong>Deadline:</strong> {task.deadline ? new Date(task.deadline).toLocaleString() : 'Not set'}
                          </p>
                          <p style={{ marginBottom: '0.5rem', color: '#64748b' }}>
                            <strong>Created:</strong> {task.created_at ? new Date(task.created_at).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                          <span
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: '20px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              backgroundColor: task.status === 'completed' ? '#d1fae5' : task.status === 'in_progress' ? '#dbeafe' : '#fef3c7',
                              color: task.status === 'completed' ? '#065f46' : task.status === 'in_progress' ? '#1e40af' : '#92400e'
                            }}
                          >
                            {task.status || 'pending'}
                          </span>
                          <select
                            value={task.status || 'pending'}
                            onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                            style={{
                              padding: '0.5rem',
                              border: '2px solid #d1fae5',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Work Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="schedule-section">
            <div className="section-header-bar">
              <h2>Work Schedule & Shifts</h2>
            </div>
            <div className="schedule-employees-list">
              {employees.map(employee => (
                <div key={employee.id} className="schedule-employee-card">
                  <div className="schedule-employee-header">
                    <h3>{employee.full_name}</h3>
                    <span className="employee-role">{rolePermissions[employee.role]?.name || employee.role}</span>
                  </div>
                  <div className="schedule-details">
                    <div className="schedule-input-group">
                      <label>Days Off:</label>
                      <input
                        type="text"
                        value={employee.workSchedule?.daysOff?.join(', ') || ''}
                        onChange={(e) => handleUpdateSchedule(employee.id, 'daysOff', e.target.value.split(',').map(d => d.trim()))}
                        placeholder="e.g., Friday, Saturday"
                        className="schedule-input"
                      />
                    </div>
                    <div className="schedule-shifts">
                      <h4>Shifts:</h4>
                      {employee.workSchedule?.shifts?.map((shift, idx) => (
                        <div key={idx} className="shift-item">
                          <span>{shift.day}</span>
                          <span>{shift.startTime} - {shift.endTime}</span>
                          <span className={`shift-type ${shift.type}`}>{shift.type}</span>
                        </div>
                      )) || <p className="no-shifts">No shifts assigned</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tracking Tab */}
        {activeTab === 'performance' && (
          <div className="performance-section">
            <div className="section-header-bar">
              <h2>Performance Tracking</h2>
            </div>
            <div className="performance-overview">
              <div className="performance-stat excellent">
                <div className="stat-value">{employees.filter(e => e.performance?.rating === 'excellent').length}</div>
                <div className="stat-label">Excellent</div>
              </div>
              <div className="performance-stat good">
                <div className="stat-value">{employees.filter(e => e.performance?.rating === 'good').length}</div>
                <div className="stat-label">Good</div>
              </div>
              <div className="performance-stat average">
                <div className="stat-value">{employees.filter(e => e.performance?.rating === 'average').length}</div>
                <div className="stat-label">Average</div>
              </div>
              <div className="performance-stat poor">
                <div className="stat-value">{employees.filter(e => e.performance?.rating === 'poor').length}</div>
                <div className="stat-label">Poor</div>
              </div>
            </div>
            <div className="performance-employees-list">
              {employees.map(employee => (
                <div key={employee.id} className="performance-employee-card">
                  <div className="performance-employee-header">
                    <h3>{employee.full_name}</h3>
                    <span className={`performance-rating ${employee.performance?.rating || 'average'}`}>
                      {employee.performance?.rating || 'Not Rated'}
                    </span>
                  </div>
                  <div className="performance-metrics">
                    <div className="metric-item">
                      <label>Tasks Completed:</label>
                      <span>{employee.performance?.tasksCompleted || 0}</span>
                    </div>
                    <div className="metric-item">
                      <label>On Time:</label>
                      <span>{employee.performance?.tasksOnTime || 0}</span>
                    </div>
                    <div className="metric-item">
                      <label>Delayed:</label>
                      <span className="delayed">{employee.performance?.tasksDelayed || 0}</span>
                    </div>
                  </div>
                  {employee.performance?.notes && employee.performance.notes.length > 0 && (
                    <div className="performance-notes">
                      <h4>Notes:</h4>
                      {employee.performance.notes.map((note, idx) => (
                        <p key={idx}>{note}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks Tab */}
        {activeTab === 'completed-tasks' && (
          <div className="completed-tasks-section">
            <div className="section-header-bar">
              <h2>Completed Tasks by Employee</h2>
            </div>
            <div className="completed-tasks-list">
              {employees.map(employee => (
                <div key={employee.id} className="completed-tasks-card">
                  <div className="completed-tasks-header">
                    <h3>{employee.full_name}</h3>
                    <span className="tasks-count">
                      {employee.completedTasks?.length || 0} tasks completed
                    </span>
                  </div>
                  {employee.completedTasks && employee.completedTasks.length > 0 ? (
                    <div className="tasks-list">
                      {employee.completedTasks.map((task, idx) => (
                        <div key={idx} className={`task-item ${task.status}`}>
                          <div className="task-info">
                            <span className="task-type">{task.taskType}</span>
                            <span className="task-date">{new Date(task.completedAt).toLocaleDateString()}</span>
                          </div>
                          <span className={`task-status ${task.status}`}>
                            {task.status === 'success' ? '✅ Success' : '❌ Failed'}
                          </span>
                          {task.notes && <p className="task-notes">{task.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-tasks">No completed tasks yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance & Leaves Tab */}
        {activeTab === 'attendance' && (
          <div className="attendance-section">
            <div className="section-header-bar">
              <h2>Attendance & Leaves Management</h2>
            </div>
            <div className="attendance-overview">
              <div className="attendance-stat">
                <div className="stat-value">
                  {employees.reduce((sum, e) => sum + (e.attendance?.totalAbsences || 0), 0)}
                </div>
                <div className="stat-label">Total Absences</div>
              </div>
              <div className="attendance-stat">
                <div className="stat-value">
                  {employees.reduce((sum, e) => sum + (e.attendance?.totalLeaves || 0), 0)}
                </div>
                <div className="stat-label">Total Leaves</div>
              </div>
              <div className="attendance-stat">
                <div className="stat-value">
                  {employees.reduce((sum, e) => sum + (e.attendance?.totalLates || 0), 0)}
                </div>
                <div className="stat-label">Total Lates</div>
              </div>
            </div>
            <div className="attendance-employees-list">
              {employees.map(employee => (
                <div key={employee.id} className="attendance-employee-card">
                  <div className="attendance-employee-header">
                    <h3>{employee.full_name}</h3>
                    <div className="attendance-summary">
                      <span>Absences: {employee.attendance?.totalAbsences || 0}</span>
                      <span>Leaves: {employee.attendance?.totalLeaves || 0}</span>
                      <span>Lates: {employee.attendance?.totalLates || 0}</span>
                    </div>
                  </div>
                  {employee.attendance?.absences && employee.attendance.absences.length > 0 && (
                    <div className="attendance-records">
                      <h4>Records:</h4>
                      {employee.attendance.absences.map((record, idx) => (
                        <div key={idx} className={`attendance-record ${record.type}`}>
                          <span className="record-date">{new Date(record.date).toLocaleDateString()}</span>
                          <span className="record-type">{record.type}</span>
                          {record.reason && <span className="record-reason">{record.reason}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes & Issues Tab */}
        {activeTab === 'notes' && (
          <div className="notes-section">
            <div className="section-header-bar">
              <h2>Notes, Complaints & Issues</h2>
            </div>
            <div className="notes-list">
              {employees.map(employee => (
                <div key={employee.id} className="notes-employee-card">
                  <div className="notes-employee-header">
                    <h3>{employee.full_name}</h3>
                    <span className="notes-count">
                      {employee.notes?.length || 0} notes
                    </span>
                  </div>
                  {employee.notes && employee.notes.length > 0 ? (
                    <div className="notes-items">
                      {employee.notes.map((note, idx) => (
                        <div key={idx} className={`note-item ${note.type} ${note.resolved ? 'resolved' : ''}`}>
                          <div className="note-header">
                            <span className="note-type">{note.type}</span>
                            <span className="note-date">{new Date(note.date).toLocaleDateString()}</span>
                            {note.resolved && <span className="resolved-badge">Resolved</span>}
                          </div>
                          <p className="note-description">{note.description}</p>
                          {!note.resolved && (
                            <button 
                              className="resolve-note-btn"
                              onClick={() => handleResolveNote(employee.id, idx)}
                            >
                              Mark as Resolved
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-notes">No notes or issues recorded</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="dashboard-section">
            <div className="section-header">
              <div className="section-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h2>Role Permissions</h2>
            </div>
          <div className="permissions-grid">
            {Object.entries(rolePermissions).map(([roleKey, roleInfo]) => (
              <div 
                key={roleKey} 
                className="permission-card"
              >
                <div className="permission-card-header">
                  <h3>{roleInfo.name}</h3>
                </div>
                <div className="permissions-list">
                  {roleInfo.permissions.map((permission, index) => (
                    <div key={index} className="permission-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{permission}</span>
                    </div>
                  ))}
                </div>
                <button 
                  className="edit-permissions-btn-large"
                  onClick={() => handleEditRolePermissions(roleKey)}
                  title="Edit Permissions"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit Permissions</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Role Permissions Edit Modal */}
        {editingRole && (
        <div className="modal-overlay" onClick={handleCloseRoleEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Permissions - {editingRole && rolePermissions[editingRole]?.name}</h2>
              <button className="modal-close" onClick={handleCloseRoleEdit}>×</button>
            </div>
            
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="permissions-edit-container">
              <div className="current-permissions">
                <h3>Current Permissions</h3>
                <div className="permissions-checkbox-list">
                  {availablePermissions.map((permission) => {
                    const isChecked = editingRole ? (rolePermissions[editingRole]?.permissions.includes(permission) || false) : false;
                    return (
                      <label key={permission} className="permission-checkbox-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(permission)}
                        />
                        <span className="checkmark"></span>
                        <span className="permission-text">{permission}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={handleCloseRoleEdit}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="save-btn" 
                onClick={handleSaveRolePermissions}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

