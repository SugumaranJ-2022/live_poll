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
      <div className="form-card">
        <h2>📊 Create a New Live Poll</h2>
        <p className="form-subtitle">Add a question and options. Anyone with the link will be able to vote live!</p>

        {error && <div className="alert alert-error">{error}</div>}

        {createdPoll ? (
          <div className="success-card">
            <div className="success-icon">🎉</div>
            <h3>Poll Created Successfully!</h3>
            <p>Share this live poll link with your audience:</p>

            <div className="share-link-box">
              <input type="text" readOnly value={shareableUrl} />
              <button onClick={copyLink} className="btn-primary-sm">
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>

            <div className="success-actions">
              <a href={shareableUrl} target="_blank" rel="noreferrer" className="btn-primary-md">
                🔗 Open Poll Page
              </a>
              <Link to="/dashboard" className="btn-outline-md">
                📊 Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Poll Question</label>
              <input
                type="text"
                required
                minLength={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Which frontend framework do you prefer?"
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
                + Add Option
              </button>
            )}

            <div className="form-submit-row">
              <button type="submit" className="btn-primary-lg btn-block" disabled={loading}>
                {loading ? 'Publishing Poll...' : '🚀 Create & Publish Poll'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
