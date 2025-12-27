import { useNavigate } from 'react-router-dom';
import './About.css';

export function About() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('mockUser');
    navigate('/register');
  };

  return (
    <div className="about-page">
      <header className="about-navbar">
        <div className="about-logo" onClick={() => navigate('/home')}>
          <span className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
            </svg>
          </span>
          <span className="logo-text">PlantIllegence</span>
        </div>
        <nav className="about-nav-links">
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
            onClick={() => navigate(-1)}
          >
            Back
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </header>

      <div className="about-container">
        <div className="about-content">
          <div className="about-header">
            <h1>About Us</h1>
            <div className="about-divider"></div>
          </div>

          <div className="about-section">
            <p className="about-intro">
              We are a plant nursery specialized in producing and supplying healthy, high-quality plants. We carefully manage every growth stage, from seed selection to final delivery.
            </p>
            <p className="about-intro">
              We believe in the importance of sustainable agriculture and its role in supporting the environment and the local community. For this reason, we follow modern care practices to ensure strong and reliable plants.
            </p>
            <p className="about-intro">
              Our goal is to help individuals and farmers choose the right plants while providing a smooth and trustworthy shopping experience, both in-store and online.
            </p>
          </div>

          <div className="about-cards">
            <div className="about-card vision-card">
              <div className="card-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <h2>Our Vision</h2>
              <p>To become a trusted and leading nursery in providing healthy plants and to promote home and sustainable farming.</p>
            </div>

            <div className="about-card mission-card">
              <div className="card-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h2>Our Mission</h2>
              <p>To provide high-quality plant products with excellent service and to support customers with the guidance they need for successful planting.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}










