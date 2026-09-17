import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="page-container landing-hero">
      <div className="hero-content">
        <span className="badge-pill">⚡ Powered by Go + Redis + MongoDB</span>
        <h1>Create & Share Real-Time Live Polls Instantly</h1>
        <p className="hero-subtitle">
          Watch audience votes stream live to your screen without refreshing the page. Built for real-time engagement.
        </p>

        <div className="hero-actions">
          {user ? (
            <Link to="/create-poll" className="btn-primary-lg">🚀 Create a Live Poll</Link>
          ) : (
            <>
              <Link to="/register" className="btn-primary-lg">Get Started Free</Link>
              <Link to="/login" className="btn-secondary-lg">Sign In</Link>
            </>
          )}
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>True Redis Realtime</h3>
          <p>Redis Pub/Sub streams vote results directly to connected browser clients with zero latency or page refresh.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🛡️</div>
          <h3>Secure Authentication</h3>
          <p>JWT authentication and bcrypt password hashing ensure only authorized creators can manage their polls.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">💾</div>
          <h3>MongoDB Atomic Persistence</h3>
          <p>Votes are stored permanently and updated atomically using MongoDB's $inc operator to eliminate race conditions.</p>
        </div>
      </div>
    </div>
  );
}
