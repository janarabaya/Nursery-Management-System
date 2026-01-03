import { useState, useEffect } from 'react';
import { useRequireRole } from '../utils/useAuth';
import { API_BASE_URL } from '../config/api';
import './SupplierDashboard.css';

interface SupplyOrder {
  id: number;
  order_number: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_transit' | 'delivered' | 'cancelled';
  total_amount: number;
  created_at: string;
  expected_delivery_date?: string;
  items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  nursery_notes?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  category?: string;
  unit_price: number;
  available_quantity: number;
  image_url?: string;
  is_active: boolean;
}

interface DeliverySchedule {
  id: number;
  order_id: number;
  scheduled_date: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  delivery_address: string;
  contact_person: string;
  contact_phone: string;
  notes?: string;
  order?: SupplyOrder;
}

interface Message {
  id: number;
  from: string;
  subject: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: 'inquiry' | 'order_update' | 'general';
}

interface SupplyHistory {
  id: number;
  order_number: string;
  delivered_date: string;
  total_amount: number;
  items_count: number;
  status: string;
}

type TabType = 'orders' | 'products' | 'delivery-schedule' | 'messages' | 'history' | 'profile';

export function SupplierDashboard() {
  const { user, isLoading, hasAccess } = useRequireRole('supplier');
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [supplyHistory, setSupplyHistory] = useState<SupplyHistory[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SupplyOrder | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Product form
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    unit_price: '',
    available_quantity: '',
    image_url: '',
  });

  // Message reply
  const [replyText, setReplyText] = useState('');

  // Profile state
  const [profile, setProfile] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchProfile();
      fetchOrders();
      fetchProducts();
      fetchDeliverySchedule();
      fetchMessages();
      fetchSupplyHistory();
    }
  }, [isLoading, hasAccess]);

  const fetchProfile = async () => {
    try {
      const mockUser = localStorage.getItem('mockUser');
      if (mockUser) {
        const userData = JSON.parse(mockUser);
        setProfile({
          company_name: userData.company_name || 'Supplier Company',
          contact_name: userData.contact_name || userData.full_name || 'Contact Person',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
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
      const response = await fetch(`${API_BASE_URL}/supplier/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        // Mock data
        const mockOrders: SupplyOrder[] = [
          {
            id: 1,
            order_number: 'PO-2024-001',
            status: 'pending',
            total_amount: 50000,
            created_at: '2024-01-15T10:00:00Z',
            expected_delivery_date: '2024-01-25',
            items: [
              {
                id: 1,
                product_name: 'Tomato Seedlings',
                quantity: 1000,
                unit_price: 5,
                total_price: 5000,
              },
              {
                id: 2,
                product_name: 'Rose Plants',
                quantity: 500,
                unit_price: 10,
                total_price: 5000,
              },
            ],
            nursery_notes: 'Please ensure quality plants',
          },
          {
            id: 2,
            order_number: 'PO-2024-002',
            status: 'accepted',
            total_amount: 30000,
            created_at: '2024-01-14T14:00:00Z',
            expected_delivery_date: '2024-01-24',
            items: [
              {
                id: 3,
                product_name: 'Basil Plants',
                quantity: 2000,
                unit_price: 3,
                total_price: 6000,
              },
            ],
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

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/supplier/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        // Mock data
        const mockProducts: Product[] = [
          {
            id: 1,
            name: 'Tomato Seedlings',
            description: 'High-quality tomato seedlings',
            category: 'Vegetables',
            unit_price: 5,
            available_quantity: 5000,
            image_url: 'https://via.placeholder.com/100',
            is_active: true,
          },
          {
            id: 2,
            name: 'Rose Plants',
            description: 'Beautiful rose plants in various colors',
            category: 'Flowers',
            unit_price: 10,
            available_quantity: 2000,
            image_url: 'https://via.placeholder.com/100',
            is_active: true,
          },
          {
            id: 3,
            name: 'Basil Plants',
            description: 'Fresh basil plants',
            category: 'Herbs',
            unit_price: 3,
            available_quantity: 3000,
            image_url: 'https://via.placeholder.com/100',
            is_active: true,
          },
        ];
        setProducts(mockProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchDeliverySchedule = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/supplier/delivery-schedule`, {
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
            order_id: 2,
            scheduled_date: '2024-01-24',
            status: 'scheduled',
            delivery_address: '123 Nursery Street, Ramallah',
            contact_person: 'Ahmed Manager',
            contact_phone: '0599123456',
            notes: 'Deliver during morning hours',
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
      const response = await fetch(`${API_BASE_URL}/supplier/messages`, {
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
            subject: 'Order PO-2024-001 Update',
            message: 'Please confirm if you can deliver the order by the expected date.',
            created_at: '2024-01-15T11:00:00Z',
            is_read: false,
            type: 'order_update',
          },
          {
            id: 2,
            from: 'Nursery Management',
            subject: 'New Product Inquiry',
            message: 'Do you have any organic fertilizer available?',
            created_at: '2024-01-14T09:00:00Z',
            is_read: true,
            type: 'inquiry',
          },
        ];
        setMessages(mockMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchSupplyHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/supplier/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSupplyHistory(data);
      } else {
        // Mock data
        const mockHistory: SupplyHistory[] = [
          {
            id: 1,
            order_number: 'PO-2023-120',
            delivered_date: '2023-12-20',
            total_amount: 45000,
            items_count: 3,
            status: 'delivered',
          },
          {
            id: 2,
            order_number: 'PO-2023-119',
            delivered_date: '2023-12-15',
            total_amount: 60000,
            items_count: 5,
            status: 'delivered',
          },
        ];
        setSupplyHistory(mockHistory);
      }
    } catch (error) {
      console.error('Error fetching supply history:', error);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/supplier/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setSuccess('Order status updated successfully!');
        fetchOrders();
        fetchDeliverySchedule();
        setSelectedOrder(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
    }
  };

  const addOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!productForm.name || !productForm.unit_price || !productForm.available_quantity) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const method = selectedProduct ? 'PUT' : 'POST';
      const url = selectedProduct
        ? `${API_BASE_URL}/supplier/products/${selectedProduct.id}`
        : `${API_BASE_URL}/supplier/products`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description || null,
          category: productForm.category || null,
          unit_price: parseFloat(productForm.unit_price),
          available_quantity: parseInt(productForm.available_quantity),
          image_url: productForm.image_url || null,
        }),
      });

      if (response.ok) {
        setSuccess(selectedProduct ? 'Product updated successfully!' : 'Product added successfully!');
        setProductForm({
          name: '',
          description: '',
          category: '',
          unit_price: '',
          available_quantity: '',
          image_url: '',
        });
        setSelectedProduct(null);
        fetchProducts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(selectedProduct ? 'Failed to update product' : 'Failed to add product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    }
  };

  const deleteProduct = async (productId: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/supplier/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccess('Product deleted successfully!');
        fetchProducts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to delete product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
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
      const response = await fetch(`${API_BASE_URL}/supplier/messages/${messageId}/reply`, {
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
      const response = await fetch(`${API_BASE_URL}/supplier/profile`, {
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

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      unit_price: product.unit_price.toString(),
      available_quantity: product.available_quantity.toString(),
      image_url: product.image_url || '',
    });
  };

  if (isLoading) {
    return (
      <div className="supplier-dashboard-loading">
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
      case 'accepted':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'in_transit':
        return '#3b82f6';
      case 'delivered':
        return '#059669';
      case 'cancelled':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  const unreadMessagesCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="supplier-dashboard">
      <div className="supplier-dashboard-content">
        <header className="supplier-dashboard-header">
          <div className="header-left">
            <h1>Supplier Dashboard</h1>
            <p className="welcome-text">Welcome, {profile.company_name || 'Supplier'}! Manage your supply operations</p>
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

        <div className="supplier-tabs">
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Supply Orders
          </button>
          <button
            className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"></path>
            </svg>
            Product Catalog
          </button>
          <button
            className={`tab-btn ${activeTab === 'delivery-schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivery-schedule')}
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
            Supply History
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

        <div className="supplier-panel">
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
                <h2>Supply Orders</h2>
              </div>
              {isLoadingData ? (
                <div className="loading-state">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="empty-state">No orders received</div>
              ) : (
                <div className="orders-list">
                  {orders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div>
                          <h3>{order.order_number}</h3>
                          <p className="order-date">Created: {new Date(order.created_at).toLocaleDateString()}</p>
                          {order.expected_delivery_date && (
                            <p className="delivery-date">Expected: {new Date(order.expected_delivery_date).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="order-status-badge" style={{ backgroundColor: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <div className="order-details">
                        <p><strong>Total Amount:</strong> ${order.total_amount.toFixed(2)}</p>
                        <div className="order-items">
                          <strong>Items:</strong>
                          <ul>
                            {order.items.map(item => (
                              <li key={item.id}>
                                {item.product_name} - Qty: {item.quantity} - ${item.total_price.toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {order.nursery_notes && (
                          <p className="nursery-notes"><strong>Nursery Notes:</strong> {order.nursery_notes}</p>
                        )}
                      </div>
                      <div className="order-actions">
                        {order.status === 'pending' && (
                          <>
                            <button
                              className="status-btn accept"
                              onClick={() => updateOrderStatus(order.id, 'accepted')}
                            >
                              Accept Order
                            </button>
                            <button
                              className="status-btn reject"
                              onClick={() => updateOrderStatus(order.id, 'rejected')}
                            >
                              Reject Order
                            </button>
                          </>
                        )}
                        {order.status === 'accepted' && (
                          <button
                            className="status-btn in-transit"
                            onClick={() => updateOrderStatus(order.id, 'in_transit')}
                          >
                            Mark as In Transit
                          </button>
                        )}
                        {order.status === 'in_transit' && (
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

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"></path>
                  </svg>
                </div>
                <h2>Product Catalog</h2>
              </div>
              <div className="two-column-layout">
                <div className="form-section">
                  <h3>{selectedProduct ? 'Edit Product' : 'Add New Product'}</h3>
                  <form className="product-form" onSubmit={addOrUpdateProduct}>
                    <div className="form-group">
                      <label htmlFor="name">Product Name *</label>
                      <input
                        type="text"
                        id="name"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        required
                        placeholder="Enter product name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="Enter product description"
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="category">Category</label>
                      <input
                        type="text"
                        id="category"
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        placeholder="e.g., Vegetables, Flowers, Herbs"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="unit_price">Unit Price ($) *</label>
                        <input
                          type="number"
                          id="unit_price"
                          step="0.01"
                          value={productForm.unit_price}
                          onChange={(e) => setProductForm({ ...productForm, unit_price: e.target.value })}
                          required
                          placeholder="0.00"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="available_quantity">Available Quantity *</label>
                        <input
                          type="number"
                          id="available_quantity"
                          value={productForm.available_quantity}
                          onChange={(e) => setProductForm({ ...productForm, available_quantity: e.target.value })}
                          required
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="image_url">Image URL</label>
                      <input
                        type="url"
                        id="image_url"
                        value={productForm.image_url}
                        onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <div className="form-actions">
                      {selectedProduct && (
                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={() => {
                            setSelectedProduct(null);
                            setProductForm({
                              name: '',
                              description: '',
                              category: '',
                              unit_price: '',
                              available_quantity: '',
                              image_url: '',
                            });
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button type="submit" className="save-btn">
                        {selectedProduct ? 'Update Product' : 'Add Product'}
                      </button>
                    </div>
                  </form>
                </div>
                <div className="products-section">
                  <h3>Your Products</h3>
                  <div className="products-list">
                    {products.length === 0 ? (
                      <div className="empty-state">No products added yet</div>
                    ) : (
                      products.map(product => (
                        <div key={product.id} className="product-card">
                          {product.image_url && (
                            <img src={product.image_url} alt={product.name} className="product-image" />
                          )}
                          <div className="product-info">
                            <h4>{product.name}</h4>
                            {product.category && <p className="category">{product.category}</p>}
                            {product.description && <p className="description">{product.description}</p>}
                            <div className="product-pricing">
                              <span className="price">${product.unit_price.toFixed(2)}</span>
                              <span className="quantity">Available: {product.available_quantity}</span>
                            </div>
                            <div className="product-status">
                              <span className={`status-badge ${product.is_active ? 'active' : 'inactive'}`}>
                                {product.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <div className="product-actions">
                            <button className="edit-btn" onClick={() => handleEditProduct(product)}>
                              Edit
                            </button>
                            <button className="delete-btn" onClick={() => deleteProduct(product.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Schedule Tab */}
          {activeTab === 'delivery-schedule' && (
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
              <div className="delivery-schedule-list">
                {deliverySchedule.length === 0 ? (
                  <div className="empty-state">No scheduled deliveries</div>
                ) : (
                  deliverySchedule.map(schedule => (
                    <div key={schedule.id} className="delivery-card">
                      <div className="delivery-header">
                        <div>
                          <h3>Order {schedule.order?.order_number || `#${schedule.order_id}`}</h3>
                          <p className="scheduled-date">Scheduled: {new Date(schedule.scheduled_date).toLocaleDateString()}</p>
                        </div>
                        <div className="delivery-status-badge" style={{ backgroundColor: getStatusColor(schedule.status) + '20', color: getStatusColor(schedule.status) }}>
                          {schedule.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <div className="delivery-details">
                        <p><strong>Delivery Address:</strong> {schedule.delivery_address}</p>
                        <p><strong>Contact Person:</strong> {schedule.contact_person}</p>
                        <p><strong>Contact Phone:</strong> {schedule.contact_phone}</p>
                        {schedule.notes && <p><strong>Notes:</strong> {schedule.notes}</p>}
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
                <h2>Supply History & Performance</h2>
              </div>
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Order Number</th>
                      <th>Delivered Date</th>
                      <th>Total Amount</th>
                      <th>Items Count</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplyHistory.map(record => (
                      <tr key={record.id}>
                        <td>{record.order_number}</td>
                        <td>{new Date(record.delivered_date).toLocaleDateString()}</td>
                        <td>${record.total_amount.toFixed(2)}</td>
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
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Profile</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order {selectedOrder.order_number} Details</h2>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Status:</strong> {selectedOrder.status.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Total Amount:</strong> ${selectedOrder.total_amount.toFixed(2)}</p>
              <p><strong>Created:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
              {selectedOrder.expected_delivery_date && (
                <p><strong>Expected Delivery:</strong> {new Date(selectedOrder.expected_delivery_date).toLocaleDateString()}</p>
              )}
              {selectedOrder.nursery_notes && (
                <p><strong>Nursery Notes:</strong> {selectedOrder.nursery_notes}</p>
              )}
              <div>
                <strong>Items:</strong>
                <ul>
                  {selectedOrder.items.map(item => (
                    <li key={item.id}>
                      {item.product_name} - Quantity: {item.quantity} - Unit Price: ${item.unit_price.toFixed(2)} - Total: ${item.total_price.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
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






