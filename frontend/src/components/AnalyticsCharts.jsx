import React from 'react';

const PALETTE = [
  { bg: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', text: '#8b5cf6' },
  { bg: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', text: '#10b981' },
  { bg: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)', text: '#f59e0b' },
  { bg: 'linear-gradient(90deg, #ec4899 0%, #db2777 100%)', text: '#ec4899' },
  { bg: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)', text: '#06b6d4' },
  { bg: 'linear-gradient(90deg, #84cc16 0%, #65a30d 100%)', text: '#84cc16' },
];

export default function AnalyticsCharts({ polls }) {
  if (!polls || polls.length === 0) {
    return (
      <div className="empty-state-card">
        <div className="empty-icon">📈</div>
        <h3>No Data Analytics Available</h3>
        <p>Create a poll and collect votes to view visual data graphs!</p>
      </div>
    );
  }

  // Calculate global metrics across all polls
  const totalVotesCast = polls.reduce(
    (sum, p) => sum + p.options.reduce((s, o) => s + (o.votes || 0), 0),
    0
  );
  const activePollsCount = polls.filter((p) => p.isActive).length;

  return (
    <div className="analytics-visualization-section">
      <div className="analytics-summary-banner">
        <div className="banner-stat">
          <span className="stat-label">Total Poll Engagement</span>
          <span className="stat-number">{totalVotesCast} Votes</span>
        </div>
        <div className="banner-stat">
          <span className="stat-label">Active / Total Polls</span>
          <span className="stat-number">{activePollsCount} / {polls.length}</span>
        </div>
        <div className="banner-stat">
          <span className="stat-label">Avg. Votes Per Poll</span>
          <span className="stat-number">
            {polls.length > 0 ? Math.round(totalVotesCast / polls.length) : 0}
          </span>
        </div>
      </div>

      <div className="charts-grid">
        {polls.map((poll) => {
          const pollTotal = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
          
          // Find leading option
          let maxVotes = -1;
          let leadOption = null;
          poll.options.forEach((opt) => {
            if ((opt.votes || 0) > maxVotes) {
              maxVotes = opt.votes || 0;
              leadOption = opt;
            }
          });

          return (
            <div key={poll.id} className="chart-card">
              <div className="chart-header">
                <div>
                  <span className={`status-pill ${poll.isActive ? 'active' : 'closed'}`}>
                    {poll.isActive ? '🟢 Active' : '🔴 Closed'}
                  </span>
                  <h4 className="chart-question">{poll.question}</h4>
                </div>
                <div className="chart-total-votes">
                  {pollTotal} {pollTotal === 1 ? 'vote' : 'votes'}
                </div>
              </div>

              {leadOption && pollTotal > 0 && (
                <div className="lead-option-banner">
                  🏆 Leading: <strong>{leadOption.text}</strong> ({Math.round((leadOption.votes / pollTotal) * 100)}%)
                </div>
              )}

              {/* Data Visualization Bars */}
              <div className="chart-bars-wrapper">
                {poll.options.map((option, idx) => {
                  const percentage = pollTotal > 0 ? Math.round(((option.votes || 0) / pollTotal) * 100) : 0;
                  const color = PALETTE[idx % PALETTE.length];

                  return (
                    <div key={option.id} className="chart-item">
                      <div className="chart-item-meta">
                        <span className="chart-opt-name">{option.text}</span>
                        <span className="chart-opt-val">
                          {option.votes || 0} ({percentage}%)
                        </span>
                      </div>
                      <div className="chart-bar-bg">
                        <div
                          className="chart-bar-fill"
                          style={{
                            width: `${percentage}%`,
                            background: color.bg,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
