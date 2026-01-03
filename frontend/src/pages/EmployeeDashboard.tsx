import { useState, useEffect } from 'react';
import { useRequireRole } from '../utils/useAuth';
import { API_BASE_URL } from '../config/api';
import './EmployeeDashboard.css';

interface Order {
  id: number;
  status: string;
  total_amount: number;
  placed_at: string;
  updated_at: string;
  customer?: {
    user?: {
      full_name: string;
      email: string;
      phone?: string;
    };
  };
  order_items?: Array<{
    id: number;
    quantity: number;
    unit_price: number;
    inventory_item?: {
      name: string;
      plant?: {
        name: string;
        image_url?: string;
      };
    };
  }>;
}

interface InventoryItem {
  id: number;
  quantity: number;
  reorder_level: number;
  plant?: {
    name: string;
    image_url?: string;
    category?: string;
  };
}

interface CustomerMessage {
  id: number;
  customer_name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  status: 'unread' | 'read' | 'replied';
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'order' | 'inventory' | 'message' | 'task';
  created_at: string;
  is_read: boolean;
}

type TabType = 'orders' | 'inventory' | 'messages' | 'profile' | 'notifications';

export function EmployeeDashboard() {
  const { user, isLoading, hasAccess } = useRequireRole('employee');
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<CustomerMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Profile state
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
  });

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchProfile();
      fetchAssignedOrders();
      fetchInventory();
      fetchCustomerMessages();
      fetchNotifications();
    }
  }, [isLoading, hasAccess]);

  const fetchProfile = async () => {
    try {
      const mockUser = localStorage.getItem('mockUser');
      if (mockUser) {
        const userData = JSON.parse(mockUser);
        setProfile({
          full_name: userData.full_name || 'Employee',
          email: userData.email || '',
          phone: userData.phone || '',
          department: userData.department || 'Operations',
          position: userData.position || 'Nursery Employee',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchAssignedOrders = async () => {
    setIsLoadingData(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders/assigned`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        // Mock data for development
        const mockOrders: Order[] = [
          {
            id: 1,
            status: 'preparing',
            total_amount: 5000,
            placed_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
            customer: {
              user: {
                full_name: 'Ahmed Ali',
                email: 'ahmed@example.com',
                phone: '0599123456',
              },
            },
            order_items: [
              {
                id: 1,
                quantity: 10,
                unit_price: 500,
                inventory_item: {
                  name: 'Tomato Seedling',
                  plant: {
                    name: 'Tomato Seedling',
                    image_url: 'https://via.placeholder.com/100',
                  },
                },
              },
            ],
          },
          {
            id: 2,
            status: 'ready',
            total_amount: 3000,
            placed_at: '2024-01-14T14:00:00Z',
            updated_at: '2024-01-14T15:00:00Z',
            customer: {
              user: {
                full_name: 'Sara Mohammed',
                email: 'sara@example.com',
                phone: '0599876543',
              },
            },
            order_items: [
              {
                id: 2,
                quantity: 5,
                unit_price: 600,
                inventory_item: {
                  name: 'Rose Plant',
                  plant: {
                    name: 'Rose Plant',
                    image_url: 'https://via.placeholder.com/100',
                  },
                },
              },
            ],
          },
        ];
        setOrders(mockOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      } else {
        // Mock data
        const mockInventory: InventoryItem[] = [
          {
            id: 1,
            quantity: 50,
            reorder_level: 20,
            plant: {
              name: 'Tomato Seedling',
              image_url: 'https://via.placeholder.com/100',
              category: 'Vegetables',
            },
          },
          {
            id: 2,
            quantity: 30,
            reorder_level: 15,
            plant: {
              name: 'Rose Plant',
              image_url: 'https://via.placeholder.com/100',
              category: 'Flowers',
            },
          },
          {
            id: 3,
            quantity: 10,
            reorder_level: 20,
            plant: {
              name: 'Basil Plant',
              image_url: 'https://via.placeholder.com/100',
              category: 'Herbs',
            },
          },
        ];
        setInventory(mockInventory);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchCustomerMessages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        // Mock data
        const mockMessages: CustomerMessage[] = [
          {
            id: 1,
            customer_name: 'Ahmed Ali',
            email: 'ahmed@example.com',
            subject: 'Question about plant care',
            message: 'I need help with watering my tomato plants. How often should I water them?',
            created_at: '2024-01-15T09:00:00Z',
            status: 'unread',
          },
          {
            id: 2,
            customer_name: 'Sara Mohammed',
            email: 'sara@example.com',
            subject: 'Order inquiry',
            message: 'When will my order be ready for pickup?',
            created_at: '2024-01-14T16:00:00Z',
            status: 'read',
          },
        ];
        setMessages(mockMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/notifications/employee`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        // Mock data
        const mockNotifications: Notification[] = [
          {
            id: 1,
            title: 'New Order Assigned',
            message: 'You have been assigned to prepare order #1',
            type: 'order',
            created_at: '2024-01-15T10:00:00Z',
            is_read: false,
          },
          {
            id: 2,
            title: 'Low Stock Alert',
            message: 'Basil Plant is running low (10 units remaining)',
            type: 'inventory',
            created_at: '2024-01-15T08:00:00Z',
            is_read: false,
          },
          {
            id: 3,
            title: 'New Customer Message',
            message: 'Ahmed Ali sent a message about plant care',
            type: 'message',
            created_at: '2024-01-15T09:00:00Z',
            is_read: true,
          },
        ];
        setNotifications(mockNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setSuccess('Order status updated successfully!');
        fetchAssignedOrders();
        setSelectedOrder(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
    }
  };

  const sendReply = async (messageId: number) => {
    if (!replyText.trim()) {
      setError('Please enter a reply message');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reply: replyText }),
      });

      if (response.ok) {
        setSuccess('Reply sent successfully!');
        setReplyText('');
        setSelectedMessage(null);
        fetchCustomerMessages();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to send reply');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reply');
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const updateProfile = async () => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/employees/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <div className="employee-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="employee-dashboard">
      <div className="employee-dashboard-content">
        <header className="employee-dashboard-header">
          <div className="header-left">
            <h1>Employee Dashboard</h1>
            <p className="welcome-text">Welcome back, {profile.full_name || 'Employee'}!</p>
          </div>
          <div className="header-right">
            <div className="notifications-badge" onClick={() => setActiveTab('notifications')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadNotificationsCount > 0 && (
                <span className="badge-count">{unreadNotificationsCount}</span>
              )}
            </div>
          </div>
        </header>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="employee-tabs">
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Assigned Orders
          </button>
          <button
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"></path>
            </svg>
            Inventory
          </button>
          <button
            className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Customer Messages
          </button>
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </button>
          <button
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            Notifications
            {unreadNotificationsCount > 0 && (
              <span className="tab-badge">{unreadNotificationsCount}</span>
            )}
          </button>
        </div>

        <div className="employee-panel">
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  </svg>
                </div>
                <h2>Assigned Orders</h2>
              </div>
              {isLoadingData ? (
                <div className="loading-state">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="empty-state">No orders assigned to you</div>
              ) : (
                <div className="orders-list">
                  {orders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div>
                          <h3>Order #{order.id}</h3>
                          <p className="order-customer">
                            Customer: {order.customer?.user?.full_name || 'N/A'}
                          </p>
                          <p className="order-date">
                            Placed: {new Date(order.placed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="order-status-badge" data-status={order.status}>
                          {order.status}
                        </div>
                      </div>
                      <div className="order-details">
                        <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
                        {order.order_items && order.order_items.length > 0 && (
                          <div className="order-items">
                            <strong>Items:</strong>
                            <ul>
                              {order.order_items.map(item => (
                                <li key={item.id}>
                                  {item.inventory_item?.plant?.name || item.inventory_item?.name} 
                                  (Qty: {item.quantity})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="order-actions">
                        {order.status === 'pending' && (
                          <button
                            className="status-btn preparing"
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                          >
                            Mark as Preparing
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            className="status-btn ready"
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                          >
                            Mark as Ready
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            className="status-btn delivered"
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                          >
                            Mark as Delivered
                          </button>
                        )}
                        <button
                          className="view-btn"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"></path>
                  </svg>
                </div>
                <h2>Inventory (Read-Only)</h2>
              </div>
              <div className="inventory-table-container">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Plant Name</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Reorder Level</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="plant-cell">
                            {item.plant?.image_url && (
                              <img src={item.plant.image_url} alt={item.plant.name} className="plant-thumb" />
                            )}
                            <span>{item.plant?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td>{item.plant?.category || 'N/A'}</td>
                        <td>{item.quantity}</td>
                        <td>{item.reorder_level}</td>
                        <td>
                          <span className={`stock-status ${item.quantity <= item.reorder_level ? 'low' : 'ok'}`}>
                            {item.quantity <= item.reorder_level ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h2>Customer Messages</h2>
              </div>
              <div className="messages-list">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`message-card ${message.status === 'unread' ? 'unread' : ''}`}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="message-header">
                      <div>
                        <h3>{message.subject}</h3>
                        <p className="message-from">{message.customer_name} ({message.email})</p>
                      </div>
                      <div className="message-meta">
                        <span className="message-date">
                          {new Date(message.created_at).toLocaleDateString()}
                        </span>
                        {message.status === 'unread' && <span className="unread-badge">New</span>}
                      </div>
                    </div>
                    <p className="message-preview">{message.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h2>Personal Profile</h2>
              </div>
              <form className="profile-form" onSubmit={(e) => { e.preventDefault(); updateProfile(); }}>
                <div className="form-group">
                  <label htmlFor="full_name">Full Name</label>
                  <input
                    type="text"
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="department">Department</label>
                  <input
                    type="text"
                    id="department"
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    placeholder="Enter your department"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="position">Position</label>
                  <input
                    type="text"
                    id="position"
                    value={profile.position}
                    onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                    placeholder="Enter your position"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Profile</button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <h2>Notifications</h2>
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="empty-state">No notifications</div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                      onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                    >
                      <div className="notification-icon" data-type={notification.type}>
                        {notification.type === 'order' && '📦'}
                        {notification.type === 'inventory' && '📊'}
                        {notification.type === 'message' && '💬'}
                        {notification.type === 'task' && '✅'}
                      </div>
                      <div className="notification-content">
                        <h3>{notification.title}</h3>
                        <p>{notification.message}</p>
                        <span className="notification-date">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>
                      {!notification.is_read && <div className="unread-indicator"></div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order #{selectedOrder.id} Details</h2>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Customer:</strong> {selectedOrder.customer?.user?.full_name || 'N/A'}</p>
              <p><strong>Email:</strong> {selectedOrder.customer?.user?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {selectedOrder.customer?.user?.phone || 'N/A'}</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Total Amount:</strong> ${selectedOrder.total_amount.toFixed(2)}</p>
              <p><strong>Placed At:</strong> {new Date(selectedOrder.placed_at).toLocaleString()}</p>
              {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                <div>
                  <strong>Items:</strong>
                  <ul>
                    {selectedOrder.order_items.map(item => (
                      <li key={item.id}>
                        {item.inventory_item?.plant?.name || item.inventory_item?.name} - 
                        Quantity: {item.quantity} - 
                        Price: ${item.unit_price.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Reply Modal */}
      {selectedMessage && (
        <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reply to {selectedMessage.customer_name}</h2>
              <button className="modal-close" onClick={() => setSelectedMessage(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="message-details">
                <p><strong>Subject:</strong> {selectedMessage.subject}</p>
                <p><strong>Message:</strong></p>
                <div className="message-text">{selectedMessage.message}</div>
              </div>
              <div className="reply-section">
                <label htmlFor="replyText">Your Reply:</label>
                <textarea
                  id="replyText"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={5}
                />
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setSelectedMessage(null)}>Cancel</button>
                  <button className="send-btn" onClick={() => sendReply(selectedMessage.id)}>Send Reply</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






