import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          ⚡ <span>LivePoll</span>
        </Link>

        <div className="nav-links">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-item">Dashboard</Link>
              <Link to="/create-poll" className="btn-primary-sm">+ Create Poll</Link>
              <span className="user-badge">👤 {user.name}</span>
              <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-item">Login</Link>
              <Link to="/register" className="btn-primary-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
