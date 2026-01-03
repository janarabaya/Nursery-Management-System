import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrackOrder.css';
import { API_BASE_URL } from '../config/api';

interface Order {
  id: number;
  status: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  delivery_address: string;
  notes: string;
  placed_at: string;
  updated_at: string;
  order_progress: string | null;
}

interface TrackingInfo {
  status: 'at-nursery' | 'with-delivery-company' | 'delivered';
  statusText: string;
  estimatedDelivery: string;
  currentLocation: string;
  orderDate: string;
  orderProgress: string;
  orderId: number;
}

export function TrackOrder() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all orders for the current customer
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Please log in to view your orders');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/customers/me/orders`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to view your orders');
            return;
          }
          throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        setOrders(data || []);
      } catch (err: any) {
        console.error('Error fetching orders:', err);
        setError(err.message || 'Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Handle order selection and show tracking details
  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    
    if (!order.order_progress) {
      setTrackingInfo(null);
      setError('Order progress information not available');
      return;
    }

    const orderProgress = order.order_progress;
    
    // Map Order Progress from database to status
    let status: 'at-nursery' | 'with-delivery-company' | 'delivered' = 'at-nursery';
    let statusText = orderProgress;
    let currentLocation = 'Plant Nursery';
    
    const progressLower = orderProgress.toLowerCase();
    
    if (progressLower.includes('delivered') || progressLower.includes('تم التسليم')) {
      status = 'delivered';
      currentLocation = 'تم التسليم';
    } else if (progressLower.includes('transit') || progressLower.includes('shipping') || progressLower.includes('في الطريق') || progressLower.includes('شحن') || progressLower.includes('استلمته شركة التوصيل')) {
      status = 'with-delivery-company';
      currentLocation = 'استلمته شركة التوصيل';
    } else if (progressLower.includes('nursery') || progressLower.includes('المشتل') || progressLower.includes('preparing') || progressLower.includes('preparation') || progressLower.includes('بالمشتل')) {
      status = 'at-nursery';
      currentLocation = 'بالمشتل';
    }

    const orderDate = order.placed_at 
      ? new Date(order.placed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    setTrackingInfo({
      status: status,
      statusText: orderProgress,
      estimatedDelivery: '2025-12-20',
      currentLocation: currentLocation,
      orderDate: orderDate,
      orderProgress: orderProgress,
      orderId: order.id,
    });
    setError(null);
  };

  const getStatusBadgeColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered') || statusLower.includes('تم التسليم')) {
      return '#10b981'; // green
    } else if (statusLower.includes('transit') || statusLower.includes('shipping') || statusLower.includes('في الطريق') || statusLower.includes('شحن')) {
      return '#3b82f6'; // blue
    } else if (statusLower.includes('pending') || statusLower.includes('قيد الانتظار')) {
      return '#f59e0b'; // amber
    }
    return '#6b7280'; // gray
  };

  const getStatusText = (orderProgress: string | null) => {
    if (!orderProgress) return 'غير متاح';
    const progressLower = orderProgress.toLowerCase();
    if (progressLower.includes('delivered') || progressLower.includes('تم التسليم')) {
      return 'تم التسليم';
    } else if (progressLower.includes('transit') || progressLower.includes('shipping') || progressLower.includes('في الطريق') || progressLower.includes('شحن') || progressLower.includes('استلمته شركة التوصيل')) {
      return 'استلمته شركة التوصيل';
    } else if (progressLower.includes('nursery') || progressLower.includes('المشتل') || progressLower.includes('preparing') || progressLower.includes('preparation') || progressLower.includes('بالمشتل')) {
      return 'بالمشتل';
    }
    return orderProgress;
  };

  return (
    <div className="track-order-page">
      <header className="track-order-navbar">
        <div className="track-order-logo" onClick={() => navigate('/home')}>
          <span className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
            </svg>
          </span>
          <span className="logo-text">PlantIllegence</span>
        </div>
        <nav className="track-order-nav-links">
          <a href="/home">Home</a>
          <a href="/plants">Plants</a>
          <a href="/about" onClick={(e) => {
            e.preventDefault();
            navigate('/about');
          }}>About</a>
          <button
            className="favorites-icon-btn"
            onClick={() => navigate('/favorites')}
            title="Favorite products"
            aria-label="Favorite products"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          <button
            className="track-order-icon-btn"
            onClick={() => navigate('/track-order')}
            title="Track Order"
            aria-label="Track Order"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
              <path d="M12 8v8"></path>
              <path d="M8 12h8"></path>
              <circle cx="7" cy="17" r="2"></circle>
              <circle cx="17" cy="17" r="2"></circle>
            </svg>
          </button>
          <button 
            className="cart-icon-btn" 
            onClick={() => navigate('/cart')}
            title="Shopping Cart"
            aria-label="Shopping Cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </button>
          <button
            className="back-btn"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
          <button className="logout-btn" onClick={() => {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('authToken');
            navigate('/');
          }}>
            Log out
          </button>
        </nav>
      </header>

      <div className="track-order-container">
        <div className="track-order-content">
          <h1>Track Your Orders</h1>
          <p className="track-order-subtitle">View all your orders and track their delivery status</p>

          {error && !loading && (
            <div className="error-message" style={{ 
              color: '#e74c3c', 
              marginBottom: '1.5rem', 
              padding: '0.75rem', 
              background: '#fee', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ffffff' }}>
              <div className="loading-spinner-small" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem' }}>Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ffffff' }}>
              <p>You don't have any orders yet.</p>
            </div>
          ) : (
            <>
              {/* Orders List */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.5rem' }}>Your Orders</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => handleOrderClick(order)}
                      style={{
                        background: selectedOrder?.id === order.id 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: selectedOrder?.id === order.id 
                          ? '2px solid rgba(255, 255, 255, 0.5)' 
                          : '2px solid rgba(255, 255, 255, 0.2)',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedOrder?.id !== order.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedOrder?.id !== order.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ color: '#ffffff', margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
                            Order #{order.id}
                          </h3>
                          <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0.25rem 0', fontSize: '0.9rem' }}>
                            Date: {new Date(order.placed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                          <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0.25rem 0', fontSize: '0.9rem' }}>
                            Total: ${order.total_amount.toFixed(2)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                          <span
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '20px',
                              backgroundColor: getStatusBadgeColor(order.order_progress || ''),
                              color: '#ffffff',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                            }}
                          >
                            {getStatusText(order.order_progress)}
                          </span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                            Click to view details
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking Details */}
              {trackingInfo && selectedOrder && (
                <div className="tracking-info" style={{ marginTop: '2rem' }}>
                  <h2 style={{ color: '#ffffff', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Order #{selectedOrder.id} Details
                  </h2>
                  
                  {/* Timeline */}
                  <div className="tracking-timeline">
                    <div className={`timeline-step ${trackingInfo.status === 'at-nursery' ? 'active' : trackingInfo.status === 'with-delivery-company' || trackingInfo.status === 'delivered' ? 'completed' : ''}`}>
                      <div className="timeline-icon">
                        {trackingInfo.status === 'at-nursery' ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <div className="timeline-content">
                        <h3>بالمشتل</h3>
                        <p>الطلب لا يزال في المشتل</p>
                      </div>
                    </div>

                    <div className={`timeline-step ${trackingInfo.status === 'with-delivery-company' ? 'active' : trackingInfo.status === 'delivered' ? 'completed' : ''}`}>
                      <div className="timeline-icon">
                        {trackingInfo.status === 'with-delivery-company' ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
                            <path d="M12 8v8"></path>
                            <path d="M8 12h8"></path>
                            <circle cx="7" cy="17" r="2"></circle>
                            <circle cx="17" cy="17" r="2"></circle>
                          </svg>
                        ) : trackingInfo.status === 'delivered' ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                          </svg>
                        )}
                      </div>
                      <div className="timeline-content">
                        <h3>استلمته شركة التوصيل</h3>
                        <p>الطلب في الطريق إليك</p>
                      </div>
                    </div>

                    <div className={`timeline-step ${trackingInfo.status === 'delivered' ? 'active completed' : ''}`}>
                      <div className="timeline-icon">
                        {trackingInfo.status === 'delivered' ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                          </svg>
                        )}
                      </div>
                      <div className="timeline-content">
                        <h3>تم التسليم</h3>
                        <p>تم تسليم الطلب بنجاح</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Details */}
                  <div className="status-cards-container">
                    <div className="status-card-item">
                      <div className="status-label">حالة الطلب:</div>
                      <div className="status-value">{trackingInfo.orderProgress || trackingInfo.statusText}</div>
                    </div>
                    <div className="status-card-item">
                      <div className="status-label">الموقع الحالي:</div>
                      <div className="status-value">{trackingInfo.currentLocation}</div>
                    </div>
                    <div className="status-card-item">
                      <div className="status-label">تاريخ الطلب:</div>
                      <div className="status-value">{trackingInfo.orderDate}</div>
                    </div>
                    <div className="status-card-item">
                      <div className="status-label">عنوان التوصيل:</div>
                      <div className="status-value">{selectedOrder.delivery_address || 'غير متاح'}</div>
                    </div>
                    {trackingInfo.status !== 'delivered' && (
                      <div className="status-card-item">
                        <div className="status-label">تاريخ التوصيل المتوقع:</div>
                        <div className="status-value">{trackingInfo.estimatedDelivery}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
