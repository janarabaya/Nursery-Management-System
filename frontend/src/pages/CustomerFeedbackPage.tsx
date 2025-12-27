import { useState, useEffect } from 'react';
import { useRequireRole } from '../utils/useAuth';
import './CustomerFeedbackPage.css';

interface Feedback {
  id: number;
  customerName: string;
  customerEmail?: string;
  message: string;
  rating: number | null;
  date: string;
  isReviewed: boolean;
  reviewedAt?: string;
  // New fields
  type?: 'review' | 'complaint' | 'suggestion' | 'service_quality';
  productId?: number;
  productName?: string;
  orderId?: number;
  serviceRating?: {
    quality: number; // 1-5
    responseTime: number; // 1-5
    delivery: number; // 1-5
    overall: number; // 1-5
  };
  responseTime?: number; // hours to respond
  managerResponse?: string;
  resolved?: boolean;
  resolvedAt?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'product' | 'service' | 'delivery' | 'website' | 'other';
}

type RatingCategory = 'all' | 'good' | 'average' | 'poor' | 'no-rating';
type FeedbackType = 'all' | 'review' | 'complaint' | 'suggestion' | 'service_quality';
type ActiveTab = 'all' | 'reviews' | 'complaints' | 'suggestions' | 'service-quality';

function getRatingCategory(rating: number | null): 'good' | 'average' | 'poor' | 'no-rating' {
  if (!rating) return 'no-rating';
  if (rating >= 4) return 'good';
  if (rating === 3) return 'average';
  return 'poor';
}

function getFeedbackType(message: string): 'review' | 'complaint' | 'suggestion' {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('complaint') || lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('bad') || lowerMessage.includes('poor')) {
    return 'complaint';
  }
  if (lowerMessage.includes('suggest') || lowerMessage.includes('recommend') || lowerMessage.includes('improve')) {
    return 'suggestion';
  }
  return 'review';
}

export function CustomerFeedbackPage() {
  const { user, isLoading, hasAccess } = useRequireRole('manager');
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [showReviewed, setShowReviewed] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<RatingCategory>('all');
  const [typeFilter, setTypeFilter] = useState<FeedbackType>('all');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchFeedback();
    }
  }, [isLoading, hasAccess, showReviewed]);

  useEffect(() => {
    filterFeedback();
  }, [allFeedback, showReviewed, ratingFilter, typeFilter, activeTab]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllFeedback(data);
      } else {
        // Mock data
        const mockData: Feedback[] = [
          {
            id: 1,
            customerName: 'Ahmed Ali',
            customerEmail: 'ahmed@example.com',
            message: 'Great service and quality plants! Very satisfied with my purchase.',
            rating: 5,
            date: '2024-01-15',
            isReviewed: false,
          },
          {
            id: 2,
            customerName: 'Sara Mohammed',
            customerEmail: 'sara@example.com',
            message: 'The plants arrived in poor condition. I have a complaint about the delivery service.',
            rating: 2,
            date: '2024-01-16',
            isReviewed: false,
          },
          {
            id: 3,
            customerName: 'Omar Hassan',
            customerEmail: 'omar@example.com',
            message: 'Good quality but delivery was slow. I suggest improving delivery times.',
            rating: 3,
            date: '2024-01-17',
            isReviewed: true,
            reviewedAt: '2024-01-18',
          },
          {
            id: 4,
            customerName: 'Fatima Ibrahim',
            customerEmail: 'fatima@example.com',
            message: 'Excellent plants and excellent customer service! Highly recommend.',
            rating: 5,
            date: '2024-01-18',
            isReviewed: false,
          },
          {
            id: 5,
            customerName: 'Khalid Mahmoud',
            customerEmail: 'khalid@example.com',
            message: 'I would like to suggest adding more variety of indoor plants.',
            rating: 4,
            date: '2024-01-19',
            isReviewed: false,
          },
        ];
        setAllFeedback(mockData);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setError('Failed to load feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterFeedback = () => {
    let filtered = [...allFeedback];

    // Filter by active tab
    if (activeTab === 'reviews') {
      filtered = filtered.filter(item => getFeedbackType(item.message) === 'review' || item.type === 'review');
    } else if (activeTab === 'complaints') {
      filtered = filtered.filter(item => getFeedbackType(item.message) === 'complaint' || item.type === 'complaint');
    } else if (activeTab === 'suggestions') {
      filtered = filtered.filter(item => getFeedbackType(item.message) === 'suggestion' || item.type === 'suggestion');
    } else if (activeTab === 'service-quality') {
      filtered = filtered.filter(item => item.type === 'service_quality' || item.serviceRating);
    }

    // Filter by reviewed status
    if (!showReviewed) {
      filtered = filtered.filter(item => !item.isReviewed);
    }

    // Filter by rating category
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(item => getRatingCategory(item.rating) === ratingFilter);
    }

    // Filter by feedback type (additional filter)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => {
        const itemType = item.type || getFeedbackType(item.message);
        return itemType === typeFilter;
      });
    }

    setFeedback(filtered);
  };

  const handleMarkAsReviewed = async (id: number) => {
    setReviewingId(id);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/feedback/${id}/review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccess('Feedback marked as reviewed!');
        fetchFeedback();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to mark as reviewed');
      }
    } catch (err) {
      setError('Failed to mark feedback as reviewed.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleAddResponse = async (id: number) => {
    if (!responseText.trim()) {
      setError('Please enter a response');
      return;
    }

    setResolvingId(id);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/feedback/${id}/response`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          managerResponse: responseText,
          resolved: true,
          resolvedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setSuccess('Response added successfully!');
        setResponseText('');
        setShowResponseForm(false);
        fetchFeedback();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to add response');
      }
    } catch (err) {
      setError('Failed to add response. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveComplaint = async (id: number) => {
    setResolvingId(id);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/feedback/${id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccess('Complaint marked as resolved!');
        fetchFeedback();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to resolve complaint');
      }
    } catch (err) {
      setError('Failed to resolve complaint. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return <span className="no-rating">No rating</span>;
    const category = getRatingCategory(rating);
    return (
      <div className={`rating-stars ${category}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
        <span className="rating-value">({rating}/5)</span>
        <span className={`rating-category-badge ${category}`}>
          {category === 'good' ? 'Good' : category === 'average' ? 'Average' : 'Poor'}
        </span>
      </div>
    );
  };

  const getFeedbackStats = () => {
    const total = allFeedback.length;
    const reviewed = allFeedback.filter(f => f.isReviewed).length;
    const good = allFeedback.filter(f => getRatingCategory(f.rating) === 'good').length;
    const average = allFeedback.filter(f => getRatingCategory(f.rating) === 'average').length;
    const poor = allFeedback.filter(f => getRatingCategory(f.rating) === 'poor').length;
    const noRating = allFeedback.filter(f => !f.rating).length;
    const complaints = allFeedback.filter(f => getFeedbackType(f.message) === 'complaint' || f.type === 'complaint').length;
    const suggestions = allFeedback.filter(f => getFeedbackType(f.message) === 'suggestion' || f.type === 'suggestion').length;
    const serviceQuality = allFeedback.filter(f => f.type === 'service_quality' || f.serviceRating).length;
    const resolved = allFeedback.filter(f => f.resolved).length;
    const unresolved = allFeedback.filter(f => (f.type === 'complaint' || getFeedbackType(f.message) === 'complaint') && !f.resolved).length;
    const avgRating = allFeedback.filter(f => f.rating).reduce((sum, f) => sum + (f.rating || 0), 0) / allFeedback.filter(f => f.rating).length || 0;
    
    // Calculate average response time
    const responseTimes = allFeedback.filter(f => f.responseTime).map(f => f.responseTime || 0);
    const avgResponseTime = responseTimes.length > 0 
      ? (responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(1)
      : '0';

    // Service quality ratings
    const serviceRatings = allFeedback.filter(f => f.serviceRating);
    const avgServiceQuality = serviceRatings.length > 0
      ? (serviceRatings.reduce((sum, f) => sum + (f.serviceRating?.quality || 0), 0) / serviceRatings.length).toFixed(1)
      : '0';
    const avgResponseTimeRating = serviceRatings.length > 0
      ? (serviceRatings.reduce((sum, f) => sum + (f.serviceRating?.responseTime || 0), 0) / serviceRatings.length).toFixed(1)
      : '0';

    return {
      total,
      reviewed,
      pending: total - reviewed,
      good,
      average,
      poor,
      noRating,
      complaints,
      suggestions,
      serviceQuality,
      resolved,
      unresolved,
      avgRating: avgRating.toFixed(1),
      avgResponseTime,
      avgServiceQuality,
      avgResponseTimeRating,
    };
  };

  const stats = getFeedbackStats();

  if (isLoading) {
    return (
      <div className="customer-feedback-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="customer-feedback-page">
      <div className="customer-feedback-content">
        <header className="customer-feedback-header">
          <div className="header-left">
            <h1>Customer Feedback & Ratings</h1>
            <p className="welcome-text">View, analyze, and manage customer feedback to improve service quality</p>
          </div>
        </header>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        {/* Tabs */}
        <div className="feedback-tabs">
          <button 
            className={`feedback-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Feedback ({stats.total})
          </button>
          <button 
            className={`feedback-tab ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Product Reviews ({allFeedback.filter(f => getFeedbackType(f.message) === 'review' || f.type === 'review').length})
          </button>
          <button 
            className={`feedback-tab ${activeTab === 'complaints' ? 'active' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            Complaints ({stats.complaints})
            {stats.unresolved > 0 && <span className="unresolved-badge">{stats.unresolved}</span>}
          </button>
          <button 
            className={`feedback-tab ${activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
          >
            Suggestions ({stats.suggestions})
          </button>
          <button 
            className={`feedback-tab ${activeTab === 'service-quality' ? 'active' : ''}`}
            onClick={() => setActiveTab('service-quality')}
          >
            Service Quality ({stats.serviceQuality})
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="feedback-stats-grid">
          <div className="stat-card total-feedback">
            <div className="stat-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="stat-info">
              <h3>Total Feedback</h3>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>

          <div className="stat-card pending-feedback">
            <div className="stat-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <h3>Pending Review</h3>
              <p className="stat-value">{stats.pending}</p>
            </div>
          </div>

          <div className="stat-card avg-rating">
            <div className="stat-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
            </div>
            <div className="stat-info">
              <h3>Average Rating</h3>
              <p className="stat-value">{stats.avgRating}/5</p>
            </div>
          </div>

          <div className="stat-card complaints">
            <div className="stat-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div className="stat-info">
              <h3>Complaints</h3>
              <p className="stat-value">{stats.complaints}</p>
              {stats.unresolved > 0 && (
                <p className="stat-subtext">{stats.unresolved} unresolved</p>
              )}
            </div>
          </div>

          {activeTab === 'service-quality' && (
            <>
              <div className="stat-card service-quality">
                <div className="stat-icon-wrapper">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <h3>Service Quality</h3>
                  <p className="stat-value">{stats.avgServiceQuality}/5</p>
                </div>
              </div>
              <div className="stat-card response-time">
                <div className="stat-icon-wrapper">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="stat-info">
                  <h3>Response Time</h3>
                  <p className="stat-value">{stats.avgResponseTimeRating}/5</p>
                  <p className="stat-subtext">Avg: {stats.avgResponseTime}h</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="dashboard-section rating-distribution">
          <div className="section-header">
            <div className="section-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
            </div>
            <h2>Rating Distribution</h2>
          </div>
          <div className="rating-breakdown">
            <div className="rating-breakdown-item good">
              <span className="breakdown-label">Good (4-5)</span>
              <div className="breakdown-bar">
                <div
                  className="breakdown-fill good"
                  style={{ width: `${stats.total > 0 ? (stats.good / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="breakdown-count">{stats.good}</span>
            </div>
            <div className="rating-breakdown-item average">
              <span className="breakdown-label">Average (3)</span>
              <div className="breakdown-bar">
                <div
                  className="breakdown-fill average"
                  style={{ width: `${stats.total > 0 ? (stats.average / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="breakdown-count">{stats.average}</span>
            </div>
            <div className="rating-breakdown-item poor">
              <span className="breakdown-label">Poor (1-2)</span>
              <div className="breakdown-bar">
                <div
                  className="breakdown-fill poor"
                  style={{ width: `${stats.total > 0 ? (stats.poor / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="breakdown-count">{stats.poor}</span>
            </div>
            <div className="rating-breakdown-item no-rating">
              <span className="breakdown-label">No Rating</span>
              <div className="breakdown-bar">
                <div
                  className="breakdown-fill no-rating"
                  style={{ width: `${stats.total > 0 ? (stats.noRating / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="breakdown-count">{stats.noRating}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="dashboard-section filters-section">
          <div className="section-header">
            <div className="section-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <h2>Filters</h2>
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Review Status:</label>
              <select value={showReviewed ? 'reviewed' : 'pending'} onChange={(e) => setShowReviewed(e.target.value === 'reviewed')}>
                <option value="pending">Pending Review</option>
                <option value="reviewed">Reviewed</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Rating Category:</label>
              <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value as RatingCategory)}>
                <option value="all">All Ratings</option>
                <option value="good">Good (4-5)</option>
                <option value="average">Average (3)</option>
                <option value="poor">Poor (1-2)</option>
                <option value="no-rating">No Rating</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Feedback Type:</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FeedbackType)}>
                <option value="all">All Types</option>
                <option value="review">Reviews</option>
                <option value="complaint">Complaints</option>
                <option value="suggestion">Suggestions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="dashboard-section">
          <div className="section-header">
            <div className="section-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h2>Customer Feedback ({feedback.length})</h2>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner-small"></div>
              <p>Loading feedback...</p>
            </div>
          ) : feedback.length === 0 ? (
            <div className="empty-state">
              <p>No feedback found matching your filters.</p>
            </div>
          ) : (
            <div className="feedback-list">
              {feedback.map((item) => {
                const category = getRatingCategory(item.rating);
                const type = getFeedbackType(item.message);
                return (
                  <div
                    key={item.id}
                    className={`feedback-item ${item.isReviewed ? 'reviewed' : ''} ${category} ${type}`}
                    onClick={() => setSelectedFeedback(item)}
                  >
                    <div className="feedback-header">
                      <div className="feedback-customer-info">
                        <h3 className="customer-name">{item.customerName}</h3>
                        {item.customerEmail && (
                          <p className="customer-email">{item.customerEmail}</p>
                        )}
                      </div>
                      <div className="feedback-meta">
                        {renderRating(item.rating)}
                        <span className="feedback-date">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="feedback-type-badge">
                      <span className={`type-badge ${type}`}>
                        {type === 'complaint' ? '⚠️ Complaint' : type === 'suggestion' ? '💡 Suggestion' : '⭐ Review'}
                      </span>
                    </div>
                    <p className="feedback-message">{item.message}</p>
                    {/* Service Quality Ratings */}
                    {item.serviceRating && (
                      <div className="service-ratings">
                        <div className="service-rating-item">
                          <label>Quality:</label>
                          <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={star <= item.serviceRating!.quality ? 'star filled' : 'star'}>
                                ★
                              </span>
                            ))}
                            <span className="rating-value">({item.serviceRating.quality}/5)</span>
                          </div>
                        </div>
                        <div className="service-rating-item">
                          <label>Response Time:</label>
                          <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={star <= item.serviceRating!.responseTime ? 'star filled' : 'star'}>
                                ★
                              </span>
                            ))}
                            <span className="rating-value">({item.serviceRating.responseTime}/5)</span>
                          </div>
                        </div>
                        <div className="service-rating-item">
                          <label>Delivery:</label>
                          <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={star <= item.serviceRating!.delivery ? 'star filled' : 'star'}>
                                ★
                              </span>
                            ))}
                            <span className="rating-value">({item.serviceRating.delivery}/5)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Product/Order Info */}
                    {item.productName && (
                      <div className="feedback-product-info">
                        <span className="product-label">Product:</span>
                        <span className="product-name">{item.productName}</span>
                      </div>
                    )}

                    {/* Manager Response */}
                    {item.managerResponse && (
                      <div className="manager-response">
                        <div className="response-header">
                          <span className="response-label">Manager Response:</span>
                          {item.resolvedAt && (
                            <span className="response-date">
                              {new Date(item.resolvedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="response-text">{item.managerResponse}</p>
                      </div>
                    )}

                    <div className="feedback-actions">
                      {!item.isReviewed && (
                        <button
                          className="mark-reviewed-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsReviewed(item.id);
                          }}
                          disabled={reviewingId === item.id}
                        >
                          {reviewingId === item.id ? 'Marking...' : 'Mark as Reviewed'}
                        </button>
                      )}
                      {(item.type === 'complaint' || getFeedbackType(item.message) === 'complaint') && !item.resolved && (
                        <>
                          {!showResponseForm || selectedFeedback?.id !== item.id ? (
                            <button
                              className="add-response-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFeedback(item);
                                setShowResponseForm(true);
                              }}
                            >
                              Add Response
                            </button>
                          ) : (
                            <div className="response-form-container">
                              <textarea
                                className="response-textarea"
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Enter your response to the customer..."
                                rows={3}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="response-form-actions">
                                <button
                                  className="submit-response-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddResponse(item.id);
                                  }}
                                  disabled={resolvingId === item.id || !responseText.trim()}
                                >
                                  {resolvingId === item.id ? 'Sending...' : 'Send Response'}
                                </button>
                                <button
                                  className="cancel-response-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowResponseForm(false);
                                    setResponseText('');
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          <button
                            className="resolve-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveComplaint(item.id);
                            }}
                            disabled={resolvingId === item.id}
                          >
                            {resolvingId === item.id ? 'Resolving...' : 'Mark as Resolved'}
                          </button>
                        </>
                      )}
                      {item.isReviewed && (
                        <div className="reviewed-info">
                          <span className="reviewed-badge">✓ Reviewed</span>
                          {item.reviewedAt && (
                            <span className="reviewed-date">
                              on {new Date(item.reviewedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                      {item.resolved && (
                        <div className="resolved-info">
                          <span className="resolved-badge">✓ Resolved</span>
                          {item.resolvedAt && (
                            <span className="resolved-date">
                              on {new Date(item.resolvedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Improvement Insights */}
        <div className="dashboard-section improvement-insights">
          <div className="section-header">
            <div className="section-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
            </div>
            <h2>Service Improvement Insights</h2>
          </div>
          <div className="insights-grid">
            <div className="insight-card">
              <h3>Overall Satisfaction</h3>
              <p className="insight-value">{stats.avgRating}/5</p>
              <p className="insight-description">
                {parseFloat(stats.avgRating) >= 4
                  ? 'Excellent! Keep up the great work.'
                  : parseFloat(stats.avgRating) >= 3
                  ? 'Good, but there is room for improvement.'
                  : 'Needs immediate attention to improve customer satisfaction.'}
              </p>
            </div>
            <div className="insight-card">
              <h3>Complaints Rate</h3>
              <p className="insight-value">
                {stats.total > 0 ? ((stats.complaints / stats.total) * 100).toFixed(1) : 0}%
              </p>
              <p className="insight-description">
                {stats.complaints === 0
                  ? 'No complaints! Excellent service quality.'
                  : stats.complaints <= 2
                  ? 'Low complaint rate. Monitor closely.'
                  : 'High complaint rate. Review and address issues immediately.'}
              </p>
            </div>
            <div className="insight-card">
              <h3>Review Coverage</h3>
              <p className="insight-value">
                {stats.total > 0 ? ((stats.reviewed / stats.total) * 100).toFixed(1) : 0}%
              </p>
              <p className="insight-description">
                {stats.reviewed === stats.total
                  ? 'All feedback has been reviewed.'
                  : `${stats.pending} feedback items pending review.`}
              </p>
            </div>
            <div className="insight-card">
              <h3>Customer Engagement</h3>
              <p className="insight-value">{stats.suggestions}</p>
              <p className="insight-description">
                {stats.suggestions === 0
                  ? 'No suggestions yet. Encourage customer feedback.'
                  : `${stats.suggestions} valuable suggestions received. Consider implementing them.`}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Detail Modal */}
        {selectedFeedback && (
          <div className="feedback-modal" onClick={() => setSelectedFeedback(null)}>
            <div className="feedback-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Feedback Details</h2>
                <button className="modal-close" onClick={() => setSelectedFeedback(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="modal-section">
                  <h3>Customer Information</h3>
                  <p><strong>Name:</strong> {selectedFeedback.customerName}</p>
                  <p><strong>Email:</strong> {selectedFeedback.customerEmail || 'N/A'}</p>
                  <p><strong>Date:</strong> {new Date(selectedFeedback.date).toLocaleString()}</p>
                </div>
                <div className="modal-section">
                  <h3>Rating</h3>
                  {renderRating(selectedFeedback.rating)}
                </div>
                <div className="modal-section">
                  <h3>Message</h3>
                  <p className="modal-message">{selectedFeedback.message}</p>
                </div>
                <div className="modal-section">
                  <h3>Classification</h3>
                  <p>
                    <strong>Type:</strong>{' '}
                    <span className={`type-badge ${getFeedbackType(selectedFeedback.message)}`}>
                      {getFeedbackType(selectedFeedback.message) === 'complaint'
                        ? 'Complaint'
                        : getFeedbackType(selectedFeedback.message) === 'suggestion'
                        ? 'Suggestion'
                        : 'Review'}
                    </span>
                  </p>
                  <p>
                    <strong>Category:</strong>{' '}
                    <span className={`rating-category-badge ${getRatingCategory(selectedFeedback.rating)}`}>
                      {getRatingCategory(selectedFeedback.rating) === 'good'
                        ? 'Good'
                        : getRatingCategory(selectedFeedback.rating) === 'average'
                        ? 'Average'
                        : getRatingCategory(selectedFeedback.rating) === 'poor'
                        ? 'Poor'
                        : 'No Rating'}
                    </span>
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    {selectedFeedback.isReviewed ? (
                      <span className="reviewed-badge">Reviewed</span>
                    ) : (
                      <span className="pending-badge">Pending Review</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                {!selectedFeedback.isReviewed && (
                  <button
                    className="mark-reviewed-btn"
                    onClick={() => {
                      handleMarkAsReviewed(selectedFeedback.id);
                      setSelectedFeedback(null);
                    }}
                    disabled={reviewingId === selectedFeedback.id}
                  >
                    {reviewingId === selectedFeedback.id ? 'Marking...' : 'Mark as Reviewed'}
                  </button>
                )}
                <button className="close-btn" onClick={() => setSelectedFeedback(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
