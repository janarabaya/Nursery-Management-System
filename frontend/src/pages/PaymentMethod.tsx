import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentMethod.css';

type PaymentMethodType = 'cash' | 'card' | null;

export function PaymentMethod() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(null);
  const [cardData, setCardData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    email: '',
    billingAddress: '',
  });
  const [deliveryData, setDeliveryData] = useState({
    fullName: '',
    phoneNumber: '',
    deliveryAddress: '',
    additionalNotes: '',
  });

  useEffect(() => {
    // Load saved payment method and data from localStorage if exists
    const savedMethod = localStorage.getItem('selectedPaymentMethod');
    if (savedMethod === 'cash' || savedMethod === 'card') {
      setSelectedMethod(savedMethod as PaymentMethodType);
    }
    const savedCardData = localStorage.getItem('cardData');
    if (savedCardData) {
      setCardData(JSON.parse(savedCardData));
    }
    const savedDeliveryData = localStorage.getItem('deliveryData');
    if (savedDeliveryData) {
      setDeliveryData(JSON.parse(savedDeliveryData));
    }
  }, []);

  const handleMethodSelect = (method: PaymentMethodType) => {
    setSelectedMethod(method);
  };

  const handleCardInputChange = (field: string, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeliveryInputChange = (field: string, value: string) => {
    setDeliveryData(prev => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    return formatted.slice(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const handleContinue = () => {
    if (!selectedMethod) {
      alert('Please select a payment method');
      return;
    }

    // Validate and save data based on selected payment method
    if (selectedMethod === 'cash') {
      if (!deliveryData.fullName.trim()) {
        alert('Please enter your full name');
        return;
      }
      if (!deliveryData.phoneNumber.trim()) {
        alert('Please enter your phone number');
        return;
      }
      if (!deliveryData.deliveryAddress.trim()) {
        alert('Please enter your delivery address');
        return;
      }
      // Save delivery data
      localStorage.setItem('deliveryData', JSON.stringify(deliveryData));
    } else if (selectedMethod === 'card') {
      if (!cardData.cardholderName.trim()) {
        alert('Please enter cardholder name');
        return;
      }
      if (!cardData.cardNumber.trim() || cardData.cardNumber.replace(/\s/g, '').length < 16) {
        alert('Please enter a valid card number');
        return;
      }
      if (!cardData.expiryDate.trim()) {
        alert('Please enter expiry date');
        return;
      }
      if (!cardData.cvv.trim() || cardData.cvv.length < 3) {
        alert('Please enter a valid CVV');
        return;
      }
      if (!cardData.email.trim() || !cardData.email.includes('@')) {
        alert('Please enter a valid email address');
        return;
      }
      if (!cardData.billingAddress.trim()) {
        alert('Please enter billing address');
        return;
      }
      // Save card data
      localStorage.setItem('cardData', JSON.stringify(cardData));
    }

    // Save payment method to localStorage
    localStorage.setItem('selectedPaymentMethod', selectedMethod);
    // Navigate to checkout page
    navigate('/checkout');
  };

  const handleBack = () => {
    navigate('/cart');
  };

  return (
    <div className="payment-method-page">
      <header className="payment-method-navbar">
        <div className="payment-method-logo" onClick={() => navigate('/home')}>
          <span className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
            </svg>
          </span>
          <span className="logo-text">PlantIllegence</span>
        </div>
        <nav className="payment-method-nav-links">
          <a href="/home">Home</a>
          <a href="/plants" onClick={(e) => {
            e.preventDefault();
            navigate('/plants');
          }}>Plants</a>
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
            onClick={handleBack}
          >
            Back
          </button>
        </nav>
      </header>

      <div className="payment-method-container">
        <h1>Select Payment Method</h1>
        <p className="payment-method-subtitle">Choose your preferred payment method</p>

        <div className="payment-methods">
          <div 
            className={`payment-method-card ${selectedMethod === 'cash' ? 'selected' : ''}`}
            onClick={() => handleMethodSelect('cash')}
          >
            <div className="payment-method-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </div>
            <h3>Cash on Delivery</h3>
            <p>Pay when you receive your order</p>
            {selectedMethod === 'cash' && (
              <div className="selected-indicator">✓ Selected</div>
            )}
          </div>

          <div 
            className={`payment-method-card ${selectedMethod === 'card' ? 'selected' : ''}`}
            onClick={() => handleMethodSelect('card')}
          >
            <div className="payment-method-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
                <path d="M5 4h14"></path>
              </svg>
            </div>
            <h3>Credit Card</h3>
            <p>Pay securely with your credit card</p>
            {selectedMethod === 'card' && (
              <div className="selected-indicator">✓ Selected</div>
            )}
          </div>
        </div>

        {selectedMethod === 'cash' && (
          <div className="delivery-details-form">
            <h2>Delivery Information</h2>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                placeholder="John Doe"
                value={deliveryData.fullName}
                onChange={(e) => handleDeliveryInputChange('fullName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                placeholder="+970 59 123 4567"
                value={deliveryData.phoneNumber}
                onChange={(e) => handleDeliveryInputChange('phoneNumber', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="deliveryAddress">Delivery Address</label>
              <input
                type="text"
                id="deliveryAddress"
                placeholder="123 Main Street, City, Country"
                value={deliveryData.deliveryAddress}
                onChange={(e) => handleDeliveryInputChange('deliveryAddress', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="additionalNotes">Additional Notes <span className="optional">(Optional)</span></label>
              <textarea
                id="additionalNotes"
                placeholder="Any special instructions for delivery..."
                value={deliveryData.additionalNotes}
                onChange={(e) => handleDeliveryInputChange('additionalNotes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {selectedMethod === 'card' && (
          <div className="card-details-form">
            <h2>Card Details</h2>
            <div className="form-group">
              <label htmlFor="cardholderName">Cardholder Name</label>
              <input
                type="text"
                id="cardholderName"
                placeholder="John Doe"
                value={cardData.cardholderName}
                onChange={(e) => handleCardInputChange('cardholderName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cardNumber">Card Number</label>
              <input
                type="text"
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardData.cardNumber}
                onChange={(e) => handleCardInputChange('cardNumber', formatCardNumber(e.target.value))}
                maxLength={19}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiryDate">Expiry Date</label>
                <input
                  type="text"
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={cardData.expiryDate}
                  onChange={(e) => handleCardInputChange('expiryDate', formatExpiryDate(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div className="form-group">
                <label htmlFor="cvv">CVV</label>
                <input
                  type="text"
                  id="cvv"
                  placeholder="123"
                  value={cardData.cvv}
                  onChange={(e) => handleCardInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="your.email@example.com"
                value={cardData.email}
                onChange={(e) => handleCardInputChange('email', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="billingAddress">Billing Address</label>
              <input
                type="text"
                id="billingAddress"
                placeholder="123 Main Street, City, Country"
                value={cardData.billingAddress}
                onChange={(e) => handleCardInputChange('billingAddress', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="payment-method-actions">
          <button className="back-to-cart-btn" onClick={handleBack}>
            Back to Cart
          </button>
          <button 
            className="continue-btn" 
            onClick={handleContinue}
            disabled={!selectedMethod}
          >
            Continue to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}








