import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrackOrder.css';

export function TrackOrder() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState('');
  const [trackingInfo, setTrackingInfo] = useState<{
    status: string;
    statusText: string;
    estimatedDelivery: string;
    currentLocation: string;
    orderDate: string;
  } | null>(null);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderId.trim()) {
      // Simulate tracking info - in real app, this would fetch from API
      const statuses: ('at-nursery' | 'with-delivery-company' | 'delivered')[] = ['at-nursery', 'with-delivery-company', 'delivered'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      const statusTexts = {
        'at-nursery': 'Still at the Nursery',
        'with-delivery-company': 'In Transit',
        'delivered': 'Delivered'
      };

      setTrackingInfo({
        status: randomStatus,
        statusText: statusTexts[randomStatus],
        estimatedDelivery: '2025-12-20',
        currentLocation: randomStatus === 'at-nursery' ? 'Plant Nursery' : randomStatus === 'with-delivery-company' ? 'Distribution Center - Ramallah' : 'Delivered',
        orderDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      });
    }
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
            navigate('/');
          }}>
            Log out
          </button>
        </nav>
      </header>

      <div className="track-order-container">
        <div className="track-order-content">
          <h1>Track Your Order</h1>
          <p className="track-order-subtitle">Enter your order ID to track the status of your delivery</p>

          <form className="track-order-form" onSubmit={handleTrack}>
            <div className="form-group">
              <label htmlFor="orderId">Order ID</label>
              <input
                type="text"
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter your order ID"
                required
              />
            </div>
            <button type="submit" className="track-btn">
              Track Order
            </button>
          </form>

          {trackingInfo && (
            <div className="tracking-info">
              <h2>Order Status</h2>
              
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
                    <h3>Still at the Nursery</h3>
                    <p>Order is ready at the nursery</p>
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
                    <h3>Received by Delivery Company</h3>
                    <p>Order is on its way to you</p>
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
                    <h3>Delivered to Customer</h3>
                    <p>Order delivered successfully</p>
                  </div>
                </div>
              </div>

              {/* Status Details */}
              <div className="status-cards-container">
                <div className="status-card-item">
                  <div className="status-label">Current Status:</div>
                  <div className="status-value">{trackingInfo.statusText}</div>
                </div>
                <div className="status-card-item">
                  <div className="status-label">Order Date:</div>
                  <div className="status-value">{trackingInfo.orderDate}</div>
                </div>
                <div className="status-card-item">
                  <div className="status-label">Current Location:</div>
                  <div className="status-value">{trackingInfo.currentLocation}</div>
                </div>
                {trackingInfo.status !== 'delivered' && (
                  <div className="status-card-item">
                    <div className="status-label">Estimated Delivery Date:</div>
                    <div className="status-value">{trackingInfo.estimatedDelivery}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





