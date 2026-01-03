import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireRole } from '../utils/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { API_BASE_URL } from '../config/api';
import './ManagerDashboard.css';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalInventory: number;
  lowStockItems: number;
  totalEmployees: number;
  activeSuppliers: number;
}

interface LargeOrder {
  id: number;
  orderId: string;
  customerName: string;
  amount: number;
  date: string;
  status: string;
}

export function ManagerDashboard() {
  const { user, isLoading, hasAccess } = useRequireRole('manager');
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalInventory: 0,
    lowStockItems: 0,
    totalEmployees: 0,
    activeSuppliers: 0,
  });
  const [largeOrders, setLargeOrders] = useState<LargeOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  
  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    role: 'employee',
    department: '',
    phone: '',
  });
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);
  const [employeeSubmitError, setEmployeeSubmitError] = useState<string | null>(null);
  const [employeeSubmitSuccess, setEmployeeSubmitSuccess] = useState(false);
  
  // Reports state
  const [selectedReport, setSelectedReport] = useState<'sales' | 'orders' | 'customers'>('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [reportsData, setReportsData] = useState<any>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  
  // Customer feedback state
  const [feedback, setFeedback] = useState<any[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [showReviewed, setShowReviewed] = useState(false);
  const [reviewingFeedbackId, setReviewingFeedbackId] = useState<number | null>(null);

  // Helper functions (must be defined before useEffect hooks)
  const getMockFeedbackData = () => {
    return [
      {
        id: 1,
        customerName: 'Ahmed Ali',
        customerEmail: 'ahmed@example.com',
        message: 'Great service! The plants I ordered arrived in perfect condition. Very satisfied with the quality.',
        rating: 5,
        isReviewed: false,
        date: '2024-01-18T10:30:00Z',
      },
      {
        id: 2,
        customerName: 'Sara Mohammed',
        customerEmail: 'sara@example.com',
        message: 'The delivery was a bit delayed, but the customer service team was very helpful in resolving the issue.',
        rating: 4,
        isReviewed: false,
        date: '2024-01-17T14:20:00Z',
      },
      {
        id: 3,
        customerName: 'Omar Hassan',
        customerEmail: 'omar@example.com',
        message: 'Excellent quality plants. Will definitely order again!',
        rating: 5,
        isReviewed: true,
        date: '2024-01-15T09:15:00Z',
        reviewedAt: '2024-01-16T11:00:00Z',
      },
      {
        id: 4,
        customerName: 'Fatima Ibrahim',
        customerEmail: 'fatima@example.com',
        message: 'The plants are healthy and well-packaged. Thank you!',
        rating: 5,
        isReviewed: false,
        date: '2024-01-16T16:45:00Z',
      },
      {
        id: 5,
        customerName: 'Khalid Mahmoud',
        customerEmail: 'khalid@example.com',
        message: 'Good selection of plants. Prices are reasonable.',
        rating: 4,
        isReviewed: false,
        date: '2024-01-14T12:30:00Z',
      },
    ];
  };

  const getMockReportsData = (reportType: string) => {
    if (reportType === 'sales') {
      return {
        totalSales: 45230,
        totalOrders: 156,
        dailySales: [
          { date: '2024-01-15', total: 3200, count: 12 },
          { date: '2024-01-16', total: 4500, count: 18 },
          { date: '2024-01-17', total: 2800, count: 10 },
          { date: '2024-01-18', total: 5100, count: 20 },
          { date: '2024-01-19', total: 3800, count: 15 },
        ],
        salesByStatus: [
          { status: 'completed', total: 35000, count: 133 },
          { status: 'processing', total: 8200, count: 18 },
          { status: 'pending', total: 2030, count: 5 },
        ],
      };
    } else if (reportType === 'orders') {
      return {
        orders: [
          { id: 1, orderId: 'ORD-001', customerName: 'Ahmed Ali', customerEmail: 'ahmed@example.com', amount: 450, status: 'completed', date: '2024-01-18', itemsCount: 3 },
          { id: 2, orderId: 'ORD-002', customerName: 'Sara Mohammed', customerEmail: 'sara@example.com', amount: 320, status: 'processing', date: '2024-01-18', itemsCount: 2 },
          { id: 3, orderId: 'ORD-003', customerName: 'Omar Hassan', customerEmail: 'omar@example.com', amount: 680, status: 'completed', date: '2024-01-17', itemsCount: 5 },
        ],
        ordersByStatus: [
          { status: 'completed', count: 133 },
          { status: 'processing', count: 18 },
          { status: 'pending', count: 5 },
        ],
      };
    } else {
      return {
        topCustomers: [
          { customerName: 'Ahmed Ali', customerEmail: 'ahmed@example.com', orderCount: 15, totalSpent: 4500 },
          { customerName: 'Sara Mohammed', customerEmail: 'sara@example.com', orderCount: 12, totalSpent: 3200 },
          { customerName: 'Omar Hassan', customerEmail: 'omar@example.com', orderCount: 10, totalSpent: 2800 },
        ],
        activityByDay: [
          { date: '2024-01-15', uniqueCustomers: 8, orderCount: 12 },
          { date: '2024-01-16', uniqueCustomers: 12, orderCount: 18 },
          { date: '2024-01-17', uniqueCustomers: 10, orderCount: 10 },
        ],
      };
    }
  };

  // Fetch customer feedback
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!hasAccess || isLoading) return;

      setIsLoadingFeedback(true);
      try {
        const token = localStorage.getItem('authToken');
        const reviewedParam = showReviewed ? 'true' : 'false';
        const response = await fetch(`${API_BASE_URL}/feedback?reviewed=${reviewedParam}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setFeedback(data);
        } else {
          // Use mock data if API fails
          setFeedback(getMockFeedbackData());
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
        setFeedback(getMockFeedbackData());
      } finally {
        setIsLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, [hasAccess, showReviewed, isLoading]);

  // Fetch reports data
  useEffect(() => {
    const fetchReports = async () => {
      if (!hasAccess || isLoading) return;

      setIsLoadingReports(true);
      try {
        const token = localStorage.getItem('authToken');
        let endpoint = '';
        
        switch (selectedReport) {
          case 'sales':
            endpoint = `${API_BASE_URL}/reports/sales-detailed?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
            break;
          case 'orders':
            endpoint = `${API_BASE_URL}/reports/orders-detailed?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
            break;
          case 'customers':
            endpoint = `${API_BASE_URL}/reports/customer-activity?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
            break;
        }

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setReportsData(data);
        } else {
          // Use mock data if API fails
          setReportsData(getMockReportsData(selectedReport));
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        setReportsData(getMockReportsData(selectedReport));
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, [selectedReport, dateRange, hasAccess, isLoading]);

  useEffect(() => {
    // Simulate fetching dashboard data
    // In a real app, this would come from an API
    const fetchDashboardData = async () => {
      // Mock data - replace with actual API call
      setStats({
        totalOrders: 156,
        pendingOrders: 23,
        completedOrders: 133,
        totalRevenue: 45230,
        totalInventory: 1247,
        lowStockItems: 8,
        totalEmployees: 12,
        activeSuppliers: 5,
      });
    };

    const fetchLargeOrders = async () => {
      setIsLoadingOrders(true);
      try {
        // Try to fetch from API
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/orders/large`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setLargeOrders(data);
        } else {
          // Fallback to mock data if API is not available
          setLargeOrders([
            {
              id: 1,
              orderId: 'ORD-001',
              customerName: 'Ahmed Ali',
              amount: 5000,
              date: '2024-01-15',
              status: 'pending',
            },
            {
              id: 2,
              orderId: 'ORD-002',
              customerName: 'Sara Mohammed',
              amount: 7500,
              date: '2024-01-16',
              status: 'pending',
            },
            {
              id: 3,
              orderId: 'ORD-003',
              customerName: 'Omar Hassan',
              amount: 12000,
              date: '2024-01-17',
              status: 'pending',
            },
            {
              id: 4,
              orderId: 'ORD-004',
              customerName: 'Fatima Ibrahim',
              amount: 8500,
              date: '2024-01-18',
              status: 'pending',
            },
          ]);
        }
      } catch (error) {
        console.error('Error fetching large orders:', error);
        // Use mock data on error
        setLargeOrders([
          {
            id: 1,
            orderId: 'ORD-001',
            customerName: 'Ahmed Ali',
            amount: 5000,
            date: '2024-01-15',
            status: 'pending',
          },
          {
            id: 2,
            orderId: 'ORD-002',
            customerName: 'Sara Mohammed',
            amount: 7500,
            date: '2024-01-16',
            status: 'pending',
          },
          {
            id: 3,
            orderId: 'ORD-003',
            customerName: 'Omar Hassan',
            amount: 12000,
            date: '2024-01-17',
            status: 'pending',
          },
        ]);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    if (hasAccess && !isLoading) {
      fetchDashboardData();
      fetchLargeOrders();
    }
  }, [hasAccess, isLoading]);

  if (isLoading) {
    return (
      <div className="manager-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!hasAccess) {
    // Redirect will be handled by ProtectedRoute, but show loading while redirecting
    return (
      <div className="manager-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Verifying access...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('mockUser');
    navigate('/register');
  };

  const handleApproveOrder = async (orderId: number) => {
    setProcessingOrderId(orderId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'processing' }),
      });

      if (response.ok) {
        // Update local state
        setLargeOrders(prevOrders => 
          prevOrders.filter(order => order.id !== orderId)
        );
        // Update stats
        setStats(prev => ({
          ...prev,
          pendingOrders: prev.pendingOrders - 1,
        }));
        alert(`Order ${orderId} has been approved successfully!`);
      } else {
        // If API fails, update local state anyway (for demo)
        setLargeOrders(prevOrders => 
          prevOrders.filter(order => order.id !== orderId)
        );
        alert(`Order ${orderId} has been approved (demo mode)`);
      }
    } catch (error) {
      console.error('Error approving order:', error);
      // Update local state anyway (for demo)
      setLargeOrders(prevOrders => 
        prevOrders.filter(order => order.id !== orderId)
      );
      alert(`Order ${orderId} has been approved (demo mode)`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to reject this order?')) {
      return;
    }

    setProcessingOrderId(orderId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        // Update local state
        setLargeOrders(prevOrders => 
          prevOrders.filter(order => order.id !== orderId)
        );
        // Update stats
        setStats(prev => ({
          ...prev,
          pendingOrders: prev.pendingOrders - 1,
        }));
        alert(`Order ${orderId} has been rejected.`);
      } else {
        // If API fails, update local state anyway (for demo)
        setLargeOrders(prevOrders => 
          prevOrders.filter(order => order.id !== orderId)
        );
        alert(`Order ${orderId} has been rejected (demo mode)`);
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      // Update local state anyway (for demo)
      setLargeOrders(prevOrders => 
        prevOrders.filter(order => order.id !== orderId)
      );
      alert(`Order ${orderId} has been rejected (demo mode)`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEmployeeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployeeForm(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear success/error messages when user starts typing
    if (employeeSubmitSuccess) setEmployeeSubmitSuccess(false);
    if (employeeSubmitError) setEmployeeSubmitError(null);
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEmployee(true);
    setEmployeeSubmitError(null);
    setEmployeeSubmitSuccess(false);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmployeeSubmitSuccess(true);
        // Reset form
        setEmployeeForm({
          name: '',
          email: '',
          role: 'employee',
          department: '',
          phone: '',
        });
        // Update employee count
        setStats(prev => ({
          ...prev,
          totalEmployees: prev.totalEmployees + 1,
        }));
        // Clear success message after 3 seconds
        setTimeout(() => setEmployeeSubmitSuccess(false), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      setEmployeeSubmitError(error instanceof Error ? error.message : 'Failed to create employee. Please try again.');
      // For demo purposes, show success even if API fails
      if (error instanceof Error && error.message.includes('fetch')) {
        setEmployeeSubmitSuccess(true);
        setEmployeeForm({
          name: '',
          email: '',
          role: 'employee',
          department: '',
          phone: '',
        });
        setStats(prev => ({
          ...prev,
          totalEmployees: prev.totalEmployees + 1,
        }));
        setTimeout(() => setEmployeeSubmitSuccess(false), 3000);
      }
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  const handleMarkAsReviewed = async (feedbackId: number) => {
    setReviewingFeedbackId(feedbackId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}/review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state
        setFeedback(prevFeedback =>
          prevFeedback.map(item =>
            item.id === feedbackId
              ? { ...item, isReviewed: true, reviewedAt: new Date().toISOString() }
              : item
          )
        );
        alert('Feedback marked as reviewed successfully!');
      } else {
        // Update local state anyway (for demo)
        setFeedback(prevFeedback =>
          prevFeedback.map(item =>
            item.id === feedbackId
              ? { ...item, isReviewed: true, reviewedAt: new Date().toISOString() }
              : item
          )
        );
        alert('Feedback marked as reviewed (demo mode)');
      }
    } catch (error) {
      console.error('Error marking feedback as reviewed:', error);
      // Update local state anyway (for demo)
      setFeedback(prevFeedback =>
        prevFeedback.map(item =>
          item.id === feedbackId
            ? { ...item, isReviewed: true, reviewedAt: new Date().toISOString() }
            : item
        )
      );
      alert('Feedback marked as reviewed (demo mode)');
    } finally {
      setReviewingFeedbackId(null);
    }
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return <span className="no-rating">No rating</span>;
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
        <span className="rating-value">({rating}/5)</span>
      </div>
    );
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value,
    }));
  };

      const departments = [
        { name: t('dashboard.orderManagement'), path: '/order-management', icon: '📦' },
        { name: t('dashboard.plantManagement'), path: '/simple-plant-management', icon: '🌱' },
        { name: t('dashboard.employeeManagement'), path: '/employee-management', icon: '👥' },
        { name: t('dashboard.inventoryManagement'), path: '/inventory-management', icon: '📊' },
        { name: t('dashboard.reports'), path: '/reports', icon: '📈' },
        { name: t('dashboard.customerFeedback'), path: '/customer-feedback', icon: '💬' },
        { name: t('dashboard.settings'), path: '/settings', icon: '⚙️' },
      ];

  return (
    <div className="manager-dashboard-centered">
      <div className="departments-container">
        <header className="departments-header">
          <h1>{t('dashboard.title')}</h1>
          <p className="welcome-text">{t('dashboard.welcome')}, {user?.email || (language === 'ar' ? 'المدير' : 'Manager')}</p>
          <div className="header-actions">
            <button 
              className="manager-back-btn" 
              onClick={() => navigate('/home')}
            >
              {t('dashboard.back')}
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              {t('dashboard.logout')}
            </button>
          </div>
        </header>
        
        <div className="departments-grid">
          {departments.map((dept) => (
            <div 
              key={dept.path} 
              className="department-card"
              onClick={() => navigate(dept.path)}
            >
              <div className="department-icon">{dept.icon}</div>
              <h3 className="department-name">{dept.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
