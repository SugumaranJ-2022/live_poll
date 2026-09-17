import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pollService } from '../services/pollService';
import { useAuth } from '../context/AuthContext';
import ResultBar from '../components/ResultBar';

export default function DashboardPage() {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pollService.getUserPolls();
      setPolls(data);
    } catch (err) {
      setError(err.message || 'Failed to load your polls');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Are you sure you want to delete this poll?')) return;

    try {
      await pollService.deletePoll(pollId);
      setPolls(polls.filter((p) => p.id !== pollId));
    } catch (err) {
      alert(err.message || 'Failed to delete poll');
    }
  };

  const copyShareLink = (pollId) => {
    const url = `${window.location.origin}/poll/${pollId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(pollId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div className="loading-container">Loading your dashboard...</div>;
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h2>👋 Welcome back, {user?.name}!</h2>
          <p>Manage your live polls and view real-time audience engagement.</p>
        </div>
        <Link to="/create-poll" className="btn-primary-md">
          + Create New Poll
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {polls.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📊</div>
          <h3>No polls created yet</h3>
          <p>Create your first poll and share the link with your audience!</p>
          <Link to="/create-poll" className="btn-primary-md">
            Create Your First Poll
          </Link>
        </div>
      ) : (
        <div className="polls-grid">
          {polls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);

            return (
              <div key={poll.id} className="poll-card">
                <div className="poll-card-header">
                  <h3>{poll.question}</h3>
                  <span className="badge-votes">{totalVotes} total votes</span>
                </div>

                <div className="poll-options-preview">
                  {poll.options.map((option) => (
                    <ResultBar
                      key={option.id}
                      optionText={option.text}
                      votes={option.votes || 0}
                      totalVotes={totalVotes}
                    />
                  ))}
                </div>

                <div className="poll-card-actions">
                  <Link to={`/poll/${poll.id}`} className="btn-secondary-sm">
                    👁 View Live Poll
                  </Link>
                  <button onClick={() => copyShareLink(poll.id)} className="btn-outline-sm">
                    {copiedId === poll.id ? '✓ Copied!' : '📋 Share Link'}
                  </button>
                  <button onClick={() => handleDelete(poll.id)} className="btn-danger-sm">
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
