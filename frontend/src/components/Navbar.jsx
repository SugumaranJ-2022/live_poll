import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goTo = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand Header */}
        <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
          ⚡ <span>LivePoll</span>
        </Link>

        {/* Right Controls Container */}
        <div className="nav-right-controls">
          {/* Navigation Links Menu (Desktop Row & Mobile Dropdown) */}
          <div className={`nav-links-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            {user ? (
              <>
                <button
                  onClick={() => goTo('/dashboard')}
                  className="nav-link-btn"
                >
                  📊 Dashboard
                </button>

                <button
                  onClick={() => goTo('/create-poll')}
                  className="btn-primary-sm nav-create-btn"
                >
                  + Create Poll
                </button>

                <span className="user-badge">👤 {user.name}</span>

                <button onClick={handleLogout} className="btn-outline-sm nav-logout-btn">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => goTo('/login')} className="nav-link-btn">
                  Sign In
                </button>
                <button onClick={() => goTo('/register')} className="btn-primary-sm">
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Dark / Light Mode Switcher */}
          <ThemeToggle className="nav-theme-btn" />

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? '✕ Close' : '☰ Menu'}
          </button>
        </div>
      </div>
    </nav>
  );
}
