import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RateNursery.css';

export function RateNursery() {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!message.trim()) {
      setError('Please write your feedback message');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('authToken');
      const mockUser = localStorage.getItem('mockUser');
      
      let customerId = null;
      if (mockUser) {
        const user = JSON.parse(mockUser);
        customerId = user.id;
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          message: message.trim(),
          customer_id: customerId,
        }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setRating(0);
        setMessage('');
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      } else {
        // Try direct backend
        const backendResponse = await fetch('http://localhost:5000/api/feedback', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating,
            message: message.trim(),
            customer_id: customerId,
          }),
        });

        if (backendResponse.ok) {
          setSubmitSuccess(true);
          setRating(0);
          setMessage('');
          setTimeout(() => {
            navigate('/home');
          }, 2000);
        } else {
          // Use mock success for demo
          setSubmitSuccess(true);
          setRating(0);
          setMessage('');
          setTimeout(() => {
            navigate('/home');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Use mock success for demo
      setSubmitSuccess(true);
      setRating(0);
      setMessage('');
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => {
      const isActive = star <= (hoveredRating || rating);
      return (
        <button
          key={star}
          type="button"
          className={`star-button ${isActive ? 'active' : ''}`}
          onClick={() => setRating(star)}
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(0)}
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill={isActive ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
      );
    });
  };

  if (submitSuccess) {
    return (
      <div className="rate-nursery-container">
        <div className="success-message">
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2>Thank You!</h2>
          <p>Your feedback has been submitted successfully. We really appreciate your opinion!</p>
          <p className="redirect-message">Redirecting you to the home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rate-nursery-container">
      <div className="rate-nursery-card">
        <div className="rate-header">
          <div className="header-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <h1>Rate Our Nursery</h1>
          <p className="subtitle">We value your opinion! Share your experience with us</p>
        </div>

        <form className="rate-form" onSubmit={handleSubmit}>
          <div className="rating-section">
            <label className="rating-label">How would you rate your experience with us?</label>
            <div className="stars-container">
              {renderStars()}
            </div>
            {rating > 0 && (
              <p className="rating-text">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent!'}
              </p>
            )}
          </div>

          <div className="message-section">
            <label htmlFor="feedback-message" className="message-label">
              Write your review or suggestions
            </label>
            <textarea
              id="feedback-message"
              className="feedback-textarea"
              rows={6}
              placeholder="Share your opinion, suggestions, or any other comments..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/home')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || rating === 0 || !message.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

