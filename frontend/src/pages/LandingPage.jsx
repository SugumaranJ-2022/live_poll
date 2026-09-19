import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="page-container landing-hero">
      <div className="hero-content">
        <h1>Create, Vote & Analyze Live Polls Instantly</h1>
        <p className="hero-subtitle">
          Collect audience feedback in real-time with zero latency, interactive data visualization charts, and instant QR code sharing.
        </p>

        <div className="hero-actions">
          {user ? (
            <Link to="/dashboard" className="btn-primary-lg">📊 Go to Dashboard</Link>
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
          <h3>Zero-Latency Live Voting</h3>
          <p>Audience votes stream live instantly to all connected screens with automatic real-time updates.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Interactive Data Charts</h3>
          <p>Visualize audience responses with real-time bar graphs, total vote counters, and leading option badges.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Poll Lock & Access Controls</h3>
          <p>Creators can easily toggle polls active or closed anytime to control when voting is open.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📱</div>
          <h3>Instant QR Code Sharing</h3>
          <p>Share direct poll links or generated QR codes for seamless mobile audience participation.</p>
        </div>
      </div>
    </div>
  );
}
