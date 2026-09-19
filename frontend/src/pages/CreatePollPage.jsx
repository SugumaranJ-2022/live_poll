import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { pollService } from '../services/pollService';

export default function CreatePollPage() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdPoll, setCreatedPoll] = useState(null);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const applyTemplate = (templateType) => {
    switch (templateType) {
      case 'yes_no':
        setOptions(['Yes', 'No', 'Maybe']);
        break;
      case 'options_abcd':
        setOptions(['Option A', 'Option B', 'Option C', 'Option D']);
        break;
      case 'rating_5':
        setOptions(['⭐ 1 Star (Poor)', '⭐⭐ 2 Stars', '⭐⭐⭐ 3 Stars', '⭐⭐⭐⭐ 4 Stars', '⭐⭐⭐⭐⭐ 5 Stars (Excellent)']);
        break;
      case 'agree_disagree':
        setOptions(['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree']);
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean);

    if (cleanOptions.length < 2) {
      setError('Please provide at least 2 non-empty poll options');
      return;
    }

    setLoading(true);

    try {
      const poll = await pollService.createPoll(question, cleanOptions);
      setCreatedPoll(poll);
    } catch (err) {
      setError(err.message || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const shareableUrl = createdPoll ? `${window.location.origin}/poll/${createdPoll.id}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="page-container">
      <div className="page-top-actions">
        <button onClick={() => navigate('/dashboard')} className="btn-back-link">
          ← Go Back to Dashboard
        </button>
      </div>
      <div className="form-card">
        <h2>📊 Create a New Live Poll</h2>
        <p className="form-subtitle">Customize your question and options. Audience members can vote in real-time instantly!</p>

        {error && <div className="alert alert-error">{error}</div>}

        {createdPoll ? (
          <div className="success-card">
            <div className="success-icon">🎉</div>
            <h3>Poll Published Successfully!</h3>
            <p>Share this live poll link with your audience:</p>

            <div className="share-link-box">
              <input type="text" readOnly value={shareableUrl} />
              <button onClick={copyLink} className="btn-primary-sm">
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>

            <div className="success-actions">
              <a href={shareableUrl} target="_blank" rel="noreferrer" className="btn-primary-md">
                🔗 Open Live Poll Page
              </a>
              <Link to="/dashboard" className="btn-outline-md">
                📊 Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Quick Templates Bar */}
            <div className="template-presets-bar">
              <span className="template-label">⚡ Quick Templates:</span>
              <button type="button" onClick={() => applyTemplate('yes_no')} className="btn-template">
                Yes / No / Maybe
              </button>
              <button type="button" onClick={() => applyTemplate('options_abcd')} className="btn-template">
                Option A/B/C/D
              </button>
              <button type="button" onClick={() => applyTemplate('rating_5')} className="btn-template">
                1-5 Star Rating
              </button>
              <button type="button" onClick={() => applyTemplate('agree_disagree')} className="btn-template">
                Agree / Disagree
              </button>
            </div>

            <div className="form-group">
              <label>Poll Question</label>
              <input
                type="text"
                required
                minLength={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Which technology stack is best for real-time web applications?"
              />
            </div>

            <div className="form-group">
              <label>Poll Options (minimum 2)</label>
              {options.map((optionText, idx) => (
                <div key={idx} className="option-input-row">
                  <input
                    type="text"
                    required
                    value={optionText}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="btn-danger-icon"
                      title="Remove option"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button type="button" onClick={addOption} className="btn-secondary-sm add-option-btn">
                + Add Another Option
              </button>
            )}

            <div className="form-submit-row">
              <button type="submit" className="btn-primary-lg btn-block" disabled={loading}>
                {loading ? 'Publishing Live Poll...' : '🚀 Create & Publish Poll'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
