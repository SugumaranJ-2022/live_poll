import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-container flex-center">
      <div className="empty-state-card">
        <div className="empty-icon">4️⃣0️⃣4️⃣</div>
        <h2>Page Not Found</h2>
        <p>The poll or page you are looking for does not exist or has been removed.</p>
        <Link to="/" className="btn-primary-md">
          Return Home
        </Link>
      </div>
    </div>
  );
}
