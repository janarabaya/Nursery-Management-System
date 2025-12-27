import { useNavigate } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  variant?: 'home' | 'plants';
  onFavoritesClick?: () => void;
}

export function Navbar({ variant = 'home', onFavoritesClick }: NavbarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('mockUser');
    navigate('/register');
  };

  const handleLogoClick = () => {
    if (variant === 'plants') {
      navigate('/home');
    }
  };

  const favoritesClickHandler = () => {
    if (onFavoritesClick) {
      onFavoritesClick();
    } else {
      navigate('/favorites');
    }
  };

  const navbarClass = variant === 'home' ? 'home-navbar' : 'plants-navbar';
  const logoClass = variant === 'home' ? 'home-logo' : 'plants-logo';
  const navLinksClass = variant === 'home' ? 'home-nav-links' : 'plants-nav-links';

  return (
    <header className={navbarClass}>
      <div className={logoClass} onClick={handleLogoClick}>
        <span className="logo-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
          </svg>
        </span>
        <span className="logo-text">PlantIllegence</span>
      </div>
      <nav className={navLinksClass}>
        <a href={variant === 'home' ? '#home' : '/home'}>Home</a>
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
          onClick={favoritesClickHandler}
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
          className="rating-icon-btn"
          onClick={() => navigate('/rate-nursery')}
          title="Rate Our Nursery"
          aria-label="Rate Our Nursery"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
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
  );
}






