const StatCard = ({ icon, label, value, color = '#3b82f6', bgColor, change, changeType = 'positive', loading = false }) => {
  if (loading) {
    return (
      <div className="stat-card">
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 32, width: '60%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 14, width: '80%' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="stat-card"
      style={{ '--accent-color': color }}
    >
      <style>{`.stat-card::before { background: var(--accent-color, #3b82f6); }`}</style>
      <div
        className="stat-icon"
        style={{ background: bgColor || `${color}18`, color }}
      >
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {change !== undefined && (
          <div className={`stat-change ${changeType}`}>
            {changeType === 'positive' ? '↑' : '↓'} {change}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
