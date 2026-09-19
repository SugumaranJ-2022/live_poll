import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pollService } from '../services/pollService';
import { API_BASE_URL } from '../services/api';
import ResultBar from '../components/ResultBar';

export default function PollPage() {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [viewersCount, setViewersCount] = useState(1);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchPoll();

    // Setup Redis Pub/Sub Realtime SSE Stream
    const eventSource = new EventSource(`${API_BASE_URL}/polls/${pollId}/stream`);

    eventSource.onopen = () => {
      setIsLive(true);
    };

    eventSource.addEventListener('vote', (e) => {
      try {
        const payload = JSON.parse(e.data);

        // Handle Viewer Presence Update
        if (payload.type === 'presence' && payload.viewers !== undefined) {
          setViewersCount(payload.viewers);
          return;
        }

        // Handle Real-Time Poll Status Change (Owner Locked/Unlocked)
        if (payload.type === 'status' && payload.isActive !== undefined) {
          setPoll((prev) => (prev ? { ...prev, isActive: payload.isActive } : prev));
          return;
        }

        // Handle Vote Updates
        if (payload.options) {
          setPoll((prev) => (prev ? { ...prev, options: payload.options } : prev));
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    });

    eventSource.onerror = () => {
      setIsLive(false);
    };

    return () => {
      eventSource.close();
    };
  }, [pollId]);

  const fetchPoll = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pollService.getPollById(pollId);
      setPoll(data);
    } catch (err) {
      setError(err.message || 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      setError('Please select an option to vote');
      return;
    }

    if (!poll?.isActive) {
      setError('This poll is closed for voting.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await pollService.vote(pollId, selectedOption);
      setPoll(res.poll);
      setHasVoted(true);
      setVotedOptionId(selectedOption);
    } catch (err) {
      setError(err.message || 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return <div className="loading-container">Loading live poll...</div>;
  }

  if (error && !poll) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const totalVotes = poll ? poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0) : 0;
  const pollUrl = window.location.href;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pollUrl)}`;

  return (
    <div className="page-container">
      <div className="page-top-actions">
        <button onClick={() => navigate('/dashboard')} className="btn-back-link">
          ← Go Back to Dashboard
        </button>
      </div>
      <div className="poll-display-card">
        {/* Header Badges */}
        <div className="poll-header-bar">
          <div className="live-status-group">
            <span className={`live-indicator ${isLive ? 'active' : ''}`}>
              {isLive ? '🟢 Live Updates Active' : '⚪ Connecting...'}
            </span>
            {isLive && (
              <span className="viewers-badge" title="Active viewers on this page right now">
                👁️ {viewersCount} {viewersCount === 1 ? 'Viewer' : 'Viewers'} Live
              </span>
            )}
          </div>
          <div className="share-actions-group">
            <button onClick={() => setShowQRModal(true)} className="btn-icon-sm" title="Show QR Code">
              📱 QR Code
            </button>
            <button onClick={copyShareLink} className="btn-icon-sm">
              {copiedLink ? '✓ Copied' : '🔗 Share'}
            </button>
            <span className="total-votes-badge">{totalVotes} {totalVotes === 1 ? 'Vote' : 'Votes'}</span>
          </div>
        </div>

        {/* Poll Title */}
        <h2>{poll.question}</h2>

        {!poll.isActive && (
          <div className="alert alert-warning">
            🔒 <strong>Poll Closed:</strong> The creator has locked voting on this poll. Results continue updating live below.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {/* Voting Form vs Results */}
        {!hasVoted && poll.isActive ? (
          <form onSubmit={handleVote} className="voting-form">
            <div className="options-radio-group">
              {poll.options.map((option) => (
                <label
                  key={option.id}
                  className={`radio-option-card ${selectedOption === option.id ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="poll-option"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => setSelectedOption(option.id)}
                  />
                  <span className="option-label-text">{option.text}</span>
                </label>
              ))}
            </div>

            <button type="submit" className="btn-primary-lg btn-block" disabled={submitting}>
              {submitting ? 'Submitting Vote...' : '🗳 Cast Vote'}
            </button>
          </form>
        ) : (
          <div className="voted-results-view">
            {hasVoted && (
              <div className="voted-alert">
                ✓ Your vote has been recorded! Live results update in real-time below.
              </div>
            )}

            <div className="results-list">
              {poll.options.map((option) => (
                <ResultBar
                  key={option.id}
                  optionText={option.text}
                  votes={option.votes || 0}
                  totalVotes={totalVotes}
                  isSelected={option.id === votedOptionId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Sharing Modal */}
      {showQRModal && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-card qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📱 Scan to Vote on Mobile</h3>
              <button className="modal-close" onClick={() => setShowQRModal(false)}>
                ✕
              </button>
            </div>
            <div className="qr-modal-body">
              <img src={qrApiUrl} alt="Poll QR Code" className="qr-image" />
              <p className="qr-instructions">
                Scan this QR code with any smartphone camera to open and vote on this live poll!
              </p>
              <div className="qr-url-box">{pollUrl}</div>
            </div>
            <div className="modal-footer">
              <button onClick={copyShareLink} className="btn-primary-md btn-block">
                {copiedLink ? '✓ Link Copied to Clipboard' : '📋 Copy Poll Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
