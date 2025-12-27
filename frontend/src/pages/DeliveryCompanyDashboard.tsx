import { useState, useEffect } from 'react';
import { useRequireRole } from '../utils/useAuth';
import './DeliveryCompanyDashboard.css';

interface DeliveryOrder {
  id: number;
  order_number: string;
  status: 'pending' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  customer_name: string;
  delivery_address: string;
  contact_phone: string;
  scheduled_date: string;
  assigned_at: string;
  items_count: number;
  proof_of_delivery?: string;
  delivery_notes?: string;
}

interface DeliverySchedule {
  id: number;
  order_id: number;
  scheduled_date: string;
  scheduled_time: string;
  status: 'scheduled' | 'picked_up' | 'out_for_delivery' | 'delivered';
  customer_name: string;
  delivery_address: string;
  contact_phone: string;
  order?: DeliveryOrder;
}

interface Message {
  id: number;
  from: string;
  subject: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: 'delivery_update' | 'schedule_change' | 'general';
}

interface DeliveryHistory {
  id: number;
  order_number: string;
  delivered_date: string;
  customer_name: string;
  delivery_address: string;
  items_count: number;
  status: string;
  delivery_time?: string;
}

type TabType = 'orders' | 'schedule' | 'messages' | 'history' | 'profile';

export function DeliveryCompanyDashboard() {
  const { user, isLoading, hasAccess } = useRequireRole('delivery_company');
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Proof of delivery upload
  const [proofOfDelivery, setProofOfDelivery] = useState<File | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Message reply
  const [replyText, setReplyText] = useState('');

  // Profile state
  const [profile, setProfile] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    vehicle_info: '',
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchProfile();
      fetchOrders();
      fetchDeliverySchedule();
      fetchMessages();
      fetchDeliveryHistory();
    }
  }, [isLoading, hasAccess]);

  const fetchProfile = async () => {
    try {
      const mockUser = localStorage.getItem('mockUser');
      if (mockUser) {
        const userData = JSON.parse(mockUser);
        setProfile({
          company_name: userData.company_name || 'Delivery Company',
          contact_name: userData.contact_name || userData.full_name || 'Contact Person',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          vehicle_info: userData.vehicle_info || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchOrders = async () => {
    setIsLoadingData(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/delivery/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        // Mock data
        const mockOrders: DeliveryOrder[] = [
          {
            id: 1,
            order_number: 'ORD-2024-001',
            status: 'picked_up',
            customer_name: 'Ahmed Ali',
            delivery_address: '123 Main Street, Ramallah, Palestine',
            contact_phone: '0599123456',
            scheduled_date: '2024-01-20',
            assigned_at: '2024-01-18T10:00:00Z',
            items_count: 5,
          },
          {
            id: 2,
            order_number: 'ORD-2024-002',
            status: 'out_for_delivery',
            customer_name: 'Sara Mohammed',
            delivery_address: '456 Garden Avenue, Nablus, Palestine',
            contact_phone: '0599876543',
            scheduled_date: '2024-01-20',
            assigned_at: '2024-01-19T14:00:00Z',
            items_count: 3,
          },
          {
            id: 3,
            order_number: 'ORD-2024-003',
            status: 'pending',
            customer_name: 'Mohammed Hassan',
            delivery_address: '789 Plant Road, Bethlehem, Palestine',
            contact_phone: '0599554433',
            scheduled_date: '2024-01-21',
            assigned_at: '2024-01-19T16:00:00Z',
            items_count: 8,
          },
        ];
        setOrders(mockOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchDeliverySchedule = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/delivery/schedule`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeliverySchedule(data);
      } else {
        // Mock data
        const mockSchedule: DeliverySchedule[] = [
          {
            id: 1,
            order_id: 1,
            scheduled_date: '2024-01-20',
            scheduled_time: '10:00',
            status: 'picked_up',
            customer_name: 'Ahmed Ali',
            delivery_address: '123 Main Street, Ramallah, Palestine',
            contact_phone: '0599123456',
            order: orders.find(o => o.id === 1),
          },
          {
            id: 2,
            order_id: 2,
            scheduled_date: '2024-01-20',
            scheduled_time: '14:00',
            status: 'out_for_delivery',
            customer_name: 'Sara Mohammed',
            delivery_address: '456 Garden Avenue, Nablus, Palestine',
            contact_phone: '0599876543',
            order: orders.find(o => o.id === 2),
          },
        ];
        setDeliverySchedule(mockSchedule);
      }
    } catch (error) {
      console.error('Error fetching delivery schedule:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/delivery/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        // Mock data
        const mockMessages: Message[] = [
          {
            id: 1,
            from: 'Nursery Management',
            subject: 'Delivery Schedule Update',
            message: 'Please note that order ORD-2024-001 delivery time has been changed to 11:00 AM.',
            created_at: '2024-01-19T09:00:00Z',
            is_read: false,
            type: 'schedule_change',
          },
          {
            id: 2,
            from: 'Nursery Management',
            subject: 'New Delivery Assignment',
            message: 'You have been assigned a new delivery order. Please check your dashboard.',
            created_at: '2024-01-19T08:00:00Z',
            is_read: true,
            type: 'delivery_update',
          },
        ];
        setMessages(mockMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchDeliveryHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/delivery/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeliveryHistory(data);
      } else {
        // Mock data
        const mockHistory: DeliveryHistory[] = [
          {
            id: 1,
            order_number: 'ORD-2023-120',
            delivered_date: '2023-12-20',
            customer_name: 'Fatima Ali',
            delivery_address: '321 Flower Street, Ramallah',
            items_count: 4,
            status: 'delivered',
            delivery_time: '14:30',
          },
          {
            id: 2,
            order_number: 'ORD-2023-119',
            delivered_date: '2023-12-19',
            customer_name: 'Omar Hassan',
            delivery_address: '654 Plant Lane, Nablus',
            items_count: 6,
            status: 'delivered',
            delivery_time: '11:15',
          },
        ];
        setDeliveryHistory(mockHistory);
      }
    } catch (error) {
      console.error('Error fetching delivery history:', error);
    }
  };

  const updateDeliveryStatus = async (orderId: number, newStatus: string) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setSuccess('Delivery status updated successfully!');
        fetchOrders();
        fetchDeliverySchedule();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to update delivery status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update delivery status');
    }
  };

  const uploadProofOfDelivery = async (orderId: number) => {
    if (!proofOfDelivery) {
      setError('Please select a file to upload');
      return;
    }

    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('proof_of_delivery', proofOfDelivery);
    if (deliveryNotes) {
      formData.append('delivery_notes', deliveryNotes);
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setSuccess('Proof of delivery uploaded successfully!');
        setProofOfDelivery(null);
        setDeliveryNotes('');
        setSelectedOrder(null);
        fetchOrders();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to upload proof of delivery');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload proof of delivery');
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
      const response = await fetch(`${API_BASE_URL}/delivery/messages/${messageId}/reply`, {
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
        fetchMessages();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to send reply');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reply');
    }
  };

  const updateProfile = async () => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/delivery/profile`, {
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
      <div className="delivery-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'picked_up':
        return '#3b82f6';
      case 'out_for_delivery':
        return '#8b5cf6';
      case 'delivered':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const unreadMessagesCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="delivery-dashboard">
      <div className="delivery-dashboard-content">
        <header className="delivery-dashboard-header">
          <div className="header-left">
            <h1>Delivery Company Dashboard</h1>
            <p className="welcome-text">Welcome, {profile.company_name || 'Delivery Company'}! Manage your deliveries</p>
          </div>
          <div className="header-right">
            {unreadMessagesCount > 0 && (
              <div className="messages-badge" onClick={() => setActiveTab('messages')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="badge-count">{unreadMessagesCount}</span>
              </div>
            )}
          </div>
        </header>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="delivery-tabs">
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Delivery Orders
          </button>
          <button
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Delivery Schedule
          </button>
          <button
            className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Messages
            {unreadMessagesCount > 0 && (
              <span className="tab-badge">{unreadMessagesCount}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Delivery History
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
        </div>

        <div className="delivery-panel">
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
                <h2>Assigned Delivery Orders</h2>
              </div>
              {isLoadingData ? (
                <div className="loading-state">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="empty-state">No delivery orders assigned</div>
              ) : (
                <div className="orders-list">
                  {orders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div>
                          <h3>{order.order_number}</h3>
                          <p className="customer-name">Customer: {order.customer_name}</p>
                          <p className="order-date">Scheduled: {new Date(order.scheduled_date).toLocaleDateString()}</p>
                          <p className="assigned-date">Assigned: {new Date(order.assigned_at).toLocaleDateString()}</p>
                        </div>
                        <div className="order-status-badge" style={{ backgroundColor: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <div className="order-details">
                        <p><strong>Delivery Address:</strong> {order.delivery_address}</p>
                        <p><strong>Contact Phone:</strong> {order.contact_phone}</p>
                        <p><strong>Items Count:</strong> {order.items_count}</p>
                        {order.delivery_notes && (
                          <p className="delivery-notes"><strong>Notes:</strong> {order.delivery_notes}</p>
                        )}
                      </div>
                      <div className="order-actions">
                        {order.status === 'pending' && (
                          <button
                            className="status-btn picked-up"
                            onClick={() => updateDeliveryStatus(order.id, 'picked_up')}
                          >
                            Mark as Picked Up
                          </button>
                        )}
                        {order.status === 'picked_up' && (
                          <button
                            className="status-btn out-for-delivery"
                            onClick={() => updateDeliveryStatus(order.id, 'out_for_delivery')}
                          >
                            Mark as Out for Delivery
                          </button>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <button
                            className="status-btn delivered"
                            onClick={() => {
                              setSelectedOrder(order);
                            }}
                          >
                            Mark as Delivered & Upload Proof
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

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <h2>Delivery Schedule</h2>
              </div>
              <div className="schedule-list">
                {deliverySchedule.length === 0 ? (
                  <div className="empty-state">No scheduled deliveries</div>
                ) : (
                  deliverySchedule.map(schedule => (
                    <div key={schedule.id} className="schedule-card">
                      <div className="schedule-header">
                        <div>
                          <h3>Order {schedule.order?.order_number || `#${schedule.order_id}`}</h3>
                          <p className="customer-name">{schedule.customer_name}</p>
                          <p className="schedule-date-time">
                            {new Date(schedule.scheduled_date).toLocaleDateString()} at {schedule.scheduled_time}
                          </p>
                        </div>
                        <div className="schedule-status-badge" style={{ backgroundColor: getStatusColor(schedule.status) + '20', color: getStatusColor(schedule.status) }}>
                          {schedule.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <div className="schedule-details">
                        <p><strong>Delivery Address:</strong> {schedule.delivery_address}</p>
                        <p><strong>Contact Phone:</strong> {schedule.contact_phone}</p>
                      </div>
                    </div>
                  ))
                )}
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
                <h2>Messages from Nursery</h2>
              </div>
              <div className="messages-list">
                {messages.length === 0 ? (
                  <div className="empty-state">No messages</div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`message-card ${!message.is_read ? 'unread' : ''}`}
                      onClick={() => setSelectedMessage(message)}
                    >
                      <div className="message-header">
                        <div>
                          <h3>{message.subject}</h3>
                          <p className="message-from">From: {message.from}</p>
                        </div>
                        <div className="message-meta">
                          <span className="message-date">{new Date(message.created_at).toLocaleDateString()}</span>
                          {!message.is_read && <span className="unread-badge">New</span>}
                        </div>
                      </div>
                      <p className="message-preview">{message.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <h2>Delivery History & Performance</h2>
              </div>
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Order Number</th>
                      <th>Customer</th>
                      <th>Delivered Date</th>
                      <th>Delivery Time</th>
                      <th>Items Count</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryHistory.map(record => (
                      <tr key={record.id}>
                        <td>{record.order_number}</td>
                        <td>{record.customer_name}</td>
                        <td>{new Date(record.delivered_date).toLocaleDateString()}</td>
                        <td>{record.delivery_time || 'N/A'}</td>
                        <td>{record.items_count}</td>
                        <td>
                          <span className="status-badge delivered">{record.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <h2>Account & Profile</h2>
              </div>
              <form className="profile-form" onSubmit={(e) => { e.preventDefault(); updateProfile(); }}>
                <div className="form-group">
                  <label htmlFor="company_name">Company Name</label>
                  <input
                    type="text"
                    id="company_name"
                    value={profile.company_name}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact_name">Contact Name</label>
                  <input
                    type="text"
                    id="contact_name"
                    value={profile.contact_name}
                    onChange={(e) => setProfile({ ...profile, contact_name: e.target.value })}
                    placeholder="Enter contact person name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Enter company address"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vehicle_info">Vehicle Information</label>
                  <input
                    type="text"
                    id="vehicle_info"
                    value={profile.vehicle_info}
                    onChange={(e) => setProfile({ ...profile, vehicle_info: e.target.value })}
                    placeholder="e.g., Truck #123, Van #456"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Profile</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Order Details & Proof Upload Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order {selectedOrder.order_number} Details</h2>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="order-details-section">
                <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
                <p><strong>Delivery Address:</strong> {selectedOrder.delivery_address}</p>
                <p><strong>Contact Phone:</strong> {selectedOrder.contact_phone}</p>
                <p><strong>Status:</strong> {selectedOrder.status.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Scheduled Date:</strong> {new Date(selectedOrder.scheduled_date).toLocaleDateString()}</p>
                <p><strong>Items Count:</strong> {selectedOrder.items_count}</p>
                {selectedOrder.delivery_notes && (
                  <p><strong>Delivery Notes:</strong> {selectedOrder.delivery_notes}</p>
                )}
                {selectedOrder.proof_of_delivery && (
                  <p><strong>Proof of Delivery:</strong> <a href={selectedOrder.proof_of_delivery} target="_blank" rel="noopener noreferrer">View</a></p>
                )}
              </div>
              {selectedOrder.status === 'out_for_delivery' && (
                <div className="proof-upload-section">
                  <h3>Upload Proof of Delivery</h3>
                  <div className="form-group">
                    <label htmlFor="proofFile">Proof of Delivery (Image/PDF)</label>
                    <input
                      type="file"
                      id="proofFile"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofOfDelivery(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="deliveryNotes">Delivery Notes (Optional)</label>
                    <textarea
                      id="deliveryNotes"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Add any notes about the delivery..."
                      rows={3}
                    />
                  </div>
                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => setSelectedOrder(null)}>Cancel</button>
                    <button
                      className="upload-btn"
                      onClick={() => {
                        uploadProofOfDelivery(selectedOrder.id);
                        updateDeliveryStatus(selectedOrder.id, 'delivered');
                      }}
                    >
                      Upload & Mark as Delivered
                    </button>
                  </div>
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
              <h2>Reply to {selectedMessage.from}</h2>
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
                  rows={6}
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





