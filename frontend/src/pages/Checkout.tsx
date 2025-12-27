import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Checkout.css';
import { NotificationContainer } from '../components/NotificationContainer';

interface CartItem {
  id: number;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  quantity: number;
}

type PaymentMethod = 'cash' | 'card' | null;

export function Checkout() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
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
  const [orderNotifications, setOrderNotifications] = useState<Array<{ id: number; message: string }>>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('plantCart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    
    // Load saved payment method and data from localStorage
    const savedMethod = localStorage.getItem('selectedPaymentMethod');
    if (savedMethod === 'cash' || savedMethod === 'card') {
      setSelectedPayment(savedMethod as PaymentMethod);
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

  useEffect(() => {
    if (orderNotifications.length > 0) {
      const timers = orderNotifications.map((notification) => {
        return setTimeout(() => {
          setOrderNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, 2000);
      });
      
      return () => {
        timers.forEach((timer) => clearTimeout(timer));
      };
    }
  }, [orderNotifications]);

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price.replace('₪', ''));
      return total + (price * item.quantity);
    }, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('mockUser');
    navigate('/register');
  };

  const handlePlaceOrder = () => {
    if (!selectedPayment) {
      alert('Please select a payment method');
      return;
    }

    // Validate card data if card payment is selected
    if (selectedPayment === 'card') {
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
    }

    // Clear the cart
    localStorage.removeItem('plantCart');
    
    // Show success message
    const notificationId = Date.now();
    const paymentMethod = selectedPayment === 'cash' ? 'Cash on Delivery' : 'Credit / Debit Card';
    setOrderNotifications([{ id: notificationId, message: `Order placed successfully! Payment method: ${paymentMethod}` }]);
    
    // Navigate to home after showing notification
    setTimeout(() => {
      navigate('/home');
    }, 2000);
  };

  const handleCardInputChange = (field: string, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeliveryInputChange = (field: string, value: string) => {
    setDeliveryData(prev => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  return (
    <div className="checkout-page">
      <header className="checkout-navbar">
        <div className="checkout-logo" onClick={() => navigate('/home')}>
          <span className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
            </svg>
          </span>
          <span className="logo-text">PlantIllegence</span>
        </div>
        <nav className="checkout-nav-links">
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
          <button className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </header>

      <div className="checkout-container">
        <h1>Checkout</h1>
        
        {cartItems.length === 0 ? (
          <div className="empty-checkout">
            <p>Your cart is empty</p>
            <button className="continue-shopping-btn" onClick={() => navigate('/plants')}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="checkout-content">
            <div className="order-summary">
              <h2>Order Summary</h2>
              <div className="order-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="order-item">
                    <div className="order-item-image" style={{ backgroundImage: `url(${item.imageUrl})` }} />
                    <div className="order-item-details">
                      <h3>{item.name}</h3>
                      <p>Quantity: {item.quantity}</p>
                      <p className="order-item-price">₪{(parseFloat(item.price.replace('₪', '')) * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="order-total">
                <h2>Total: ₪{getTotalPrice().toFixed(2)}</h2>
              </div>
            </div>

            <div className="payment-section">
              <h2>Select Payment Method</h2>
              
              <div className="payment-options">
                <div 
                  className={`payment-option ${selectedPayment === 'cash' ? 'selected' : ''}`}
                  onClick={() => setSelectedPayment('cash')}
                >
                  <div className="payment-option-header">
                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPayment === 'cash'}
                      onChange={() => setSelectedPayment('cash')}
                    />
                    <h3>Cash on Delivery</h3>
                  </div>
                  <p>Pay with cash when your order is delivered</p>
                </div>

                <div 
                  className={`payment-option ${selectedPayment === 'card' ? 'selected' : ''}`}
                  onClick={() => setSelectedPayment('card')}
                >
                  <div className="payment-option-header">
                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPayment === 'card'}
                      onChange={() => setSelectedPayment('card')}
                    />
                    <h3>Credit / Debit Card</h3>
                  </div>
                  <p>Pay securely with your credit or debit card</p>
                </div>
              </div>

              {selectedPayment === 'cash' && (
                <div className="delivery-details-form">
                  <h3>Delivery Information</h3>
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

              {selectedPayment === 'card' && (
                <div className="card-details-form">
                  <h3>Card Details</h3>
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

              <div className="checkout-actions">
                <button className="back-to-cart-btn" onClick={() => navigate('/cart')}>
                  Back to Cart
                </button>
                <button 
                  className="place-order-btn" 
                  onClick={handlePlaceOrder}
                  disabled={!selectedPayment}
                >
                  Place Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <NotificationContainer 
        cartNotifications={orderNotifications}
        favoriteNotifications={[]}
      />
    </div>
  );
}











