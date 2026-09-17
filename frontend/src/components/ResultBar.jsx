export default function ResultBar({ optionText, votes, totalVotes, isSelected }) {
  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  return (
    <div className={`result-bar-container ${isSelected ? 'selected-option' : ''}`}>
      <div className="result-info">
        <span className="result-text">{optionText} {isSelected && '✓'}</span>
        <span className="result-count">{votes} {votes === 1 ? 'vote' : 'votes'} ({percentage}%)</span>
      </div>

      <div className="result-progress-track">
        <div
          className="result-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
