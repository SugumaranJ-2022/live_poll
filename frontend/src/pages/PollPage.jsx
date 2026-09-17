import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { pollService } from '../services/pollService';
import { API_BASE_URL } from '../services/api';
import ResultBar from '../components/ResultBar';

export default function PollPage() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);

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

  return (
    <div className="page-container">
      <div className="poll-display-card">
        <div className="poll-header-bar">
          <span className={`live-indicator ${isLive ? 'active' : ''}`}>
            {isLive ? '🟢 Live Updates Active' : '⚪ Connecting Realtime...'}
          </span>
          <span className="total-votes-badge">{totalVotes} {totalVotes === 1 ? 'Vote' : 'Votes'} Total</span>
        </div>

        <h2>{poll.question}</h2>

        {error && <div className="alert alert-error">{error}</div>}

        {!hasVoted ? (
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
            <div className="voted-alert">
              ✓ Your vote has been recorded! Results update live in real-time below.
            </div>

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
    </div>
  );
}
