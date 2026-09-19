import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pollService } from '../services/pollService';
import { useAuth } from '../context/AuthContext';
import ResultBar from '../components/ResultBar';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'closed'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'votes'
  const [selectedAnalyticsPoll, setSelectedAnalyticsPoll] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'analytics'

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [pollsData, statsData] = await Promise.all([
        pollService.getUserPolls(),
        pollService.getDashboardStats().catch(() => null),
      ]);
      setPolls(pollsData || []);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (pollId, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      await pollService.togglePollStatus(pollId, newStatus);
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId ? { ...p, isActive: newStatus } : p))
      );
      if (stats) {
        setStats((prev) => ({
          ...prev,
          activePolls: newStatus ? prev.activePolls + 1 : Math.max(0, prev.activePolls - 1),
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle poll status');
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Are you sure you want to delete this poll?')) return;

    try {
      await pollService.deletePoll(pollId);
      setPolls(polls.filter((p) => p.id !== pollId));
      if (selectedAnalyticsPoll?.id === pollId) {
        setSelectedAnalyticsPoll(null);
      }
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
    return <div className="loading-container">Loading interactive dashboard...</div>;
  }

  // Filter & Sort Logic
  const filteredPolls = polls
    .filter((poll) => {
      const matchesSearch = poll.question.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'active' && poll.isActive) ||
        (filterStatus === 'closed' && !poll.isActive);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'votes') {
        const votesA = a.options.reduce((s, o) => s + (o.votes || 0), 0);
        const votesB = b.options.reduce((s, o) => s + (o.votes || 0), 0);
        return votesB - votesA;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  return (
    <div className="page-container">
      {/* Dashboard Top Header */}
      <div className="dashboard-header">
        <div>
          <h2>👋 Welcome back, {user?.name}!</h2>
          <p>Monitor real-time audience engagement and data analytics.</p>
        </div>
        <div className="dashboard-header-right">
          <Link to="/create-poll" className="btn-primary-md">
            + Create New Poll
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Metrics Summary Cards */}
      {stats && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-info">
              <span className="metric-value">{stats.totalPolls}</span>
              <span className="metric-label">Total Polls</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🗳️</div>
            <div className="metric-info">
              <span className="metric-value">{stats.totalVotes}</span>
              <span className="metric-label">Total Votes Cast</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🟢</div>
            <div className="metric-info">
              <span className="metric-value">{stats.activePolls}</span>
              <span className="metric-label">Active Polls</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🏆</div>
            <div className="metric-info">
              <span className="metric-value metric-text-truncate" title={stats.topQuestion}>
                {stats.topQuestion}
              </span>
              <span className="metric-label">Top Poll ({stats.topVotes} votes)</span>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Selector Tabs: Polls Grid vs Visual Data Analytics */}
      <div className="view-mode-tabs-container">
        <button
          className={`view-tab-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
        >
          🎛️ Polls Management
        </button>
        <button
          className={`view-tab-btn ${viewMode === 'analytics' ? 'active' : ''}`}
          onClick={() => setViewMode('analytics')}
        >
          📊 Data Visualization Charts
        </button>
      </div>

      {/* VIEW MODE 1: Data Analytics Visualizations */}
      {viewMode === 'analytics' ? (
        <AnalyticsCharts polls={polls} />
      ) : (
        /* VIEW MODE 2: Polls Grid & Toolbar */
        <>
          {/* Search, Filter, Sort Toolbar */}
          <div className="dashboard-toolbar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search polls by question..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control search-input"
              />
            </div>

            <div className="filter-group">
              <button
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All ({polls.length})
              </button>
              <button
                className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
                onClick={() => setFilterStatus('active')}
              >
                Active ({polls.filter((p) => p.isActive).length})
              </button>
              <button
                className={`filter-btn ${filterStatus === 'closed' ? 'active' : ''}`}
                onClick={() => setFilterStatus('closed')}
              >
                Closed ({polls.filter((p) => !p.isActive).length})
              </button>
            </div>

            <div className="sort-wrapper">
              <label>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-control sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="votes">Highest Votes</option>
              </select>
            </div>
          </div>

          {/* Poll Cards List */}
          {filteredPolls.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">📊</div>
              <h3>No polls match your criteria</h3>
              <p>Try clearing your search query or creating a new live poll!</p>
              <Link to="/create-poll" className="btn-primary-md">
                Create New Poll
              </Link>
            </div>
          ) : (
            <div className="polls-grid">
              {filteredPolls.map((poll) => {
                const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);

                return (
                  <div key={poll.id} className={`poll-card ${!poll.isActive ? 'poll-closed-card' : ''}`}>
                    <div className="poll-card-header">
                      <div className="poll-title-status">
                        <span className={`status-pill ${poll.isActive ? 'active' : 'closed'}`}>
                          {poll.isActive ? '🟢 Active' : '🔴 Closed'}
                        </span>
                        <h3>{poll.question}</h3>
                      </div>
                      <span className="badge-votes">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
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
                      <button
                        onClick={() => handleToggleStatus(poll.id, poll.isActive)}
                        className={`btn-toggle-status ${poll.isActive ? 'btn-warn' : 'btn-success'}`}
                      >
                        {poll.isActive ? '⏸ Lock Voting' : '▶ Enable Voting'}
                      </button>
                      <Link to={`/poll/${poll.id}`} className="btn-secondary-sm">
                        👁 Live View
                      </Link>
                      <button onClick={() => setSelectedAnalyticsPoll(poll)} className="btn-outline-sm">
                        📈 Analytics
                      </button>
                      <button onClick={() => copyShareLink(poll.id)} className="btn-outline-sm">
                        {copiedId === poll.id ? '✓ Copied!' : '📋 Share'}
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
        </>
      )}

      {/* Analytics Modal Drawer */}
      {selectedAnalyticsPoll && (
        <div className="modal-overlay" onClick={() => setSelectedAnalyticsPoll(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📈 Poll Analytics breakdown</h3>
              <button className="modal-close" onClick={() => setSelectedAnalyticsPoll(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <h4 className="analytics-question">{selectedAnalyticsPoll.question}</h4>
              <div className="analytics-meta">
                <span>Status: <strong>{selectedAnalyticsPoll.isActive ? 'Active' : 'Closed'}</strong></span>
                <span>Total Voters: <strong>{selectedAnalyticsPoll.voters?.length || 0}</strong></span>
              </div>

              <div className="analytics-options-list">
                {selectedAnalyticsPoll.options.map((opt) => {
                  const total = selectedAnalyticsPoll.options.reduce((s, o) => s + (o.votes || 0), 0);
                  const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                  return (
                    <div key={opt.id} className="analytics-option-item">
                      <div className="analytics-opt-header">
                        <span>{opt.text}</span>
                        <span>{opt.votes} votes ({pct}%)</span>
                      </div>
                      <div className="analytics-bar-bg">
                        <div className="analytics-bar-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => copyShareLink(selectedAnalyticsPoll.id)} className="btn-primary-md">
                {copiedId === selectedAnalyticsPoll.id ? '✓ Link Copied' : '📋 Copy Shareable Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
