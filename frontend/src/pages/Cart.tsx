import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Cart.css';

interface CartItem {
  id: number;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  quantity: number;
}

export function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('plantCart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  const updateCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem('plantCart', JSON.stringify(items));
  };

  const removeItem = (id: number) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    updateCart(updatedCart);
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    const updatedCart = cartItems.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    updateCart(updatedCart);
  };

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

  return (
    <div className="cart-page">
      <header className="cart-navbar">
        <div className="cart-logo" onClick={() => navigate('/home')}>
          <span className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
            </svg>
          </span>
          <span className="logo-text">PlantIllegence</span>
        </div>
        <nav className="cart-nav-links">
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

      <div className="cart-container">
        <h1>Shopping Cart</h1>
        
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <button className="continue-shopping-btn" onClick={() => navigate('/plants')}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item">
                  <div
                    className="cart-item-image"
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                  />
                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <div className="cart-item-controls">
                      <div className="quantity-controls">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <div className="cart-item-price">
                        <span className="item-price">{item.price}</span>
                        <span className="item-total">Total: ₪{(parseFloat(item.price.replace('₪', '')) * item.quantity).toFixed(2)}</span>
                      </div>
                      <button className="remove-btn" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="cart-summary">
              <div className="cart-total">
                <h2>Total: ₪{getTotalPrice().toFixed(2)}</h2>
              </div>
              <div className="cart-actions">
                <button className="continue-shopping-btn" onClick={() => navigate('/plants')}>
                  Continue Shopping
                </button>
                <button className="checkout-btn" onClick={() => navigate('/payment-method')}>
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
