const LoadingSkeleton = ({ rows = 5, cols = 7 }) => (
  <div style={{ padding: '8px 0' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 16px', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="skeleton" style={{ height: 16, flex: j === 0 ? '0 0 60px' : 1, borderRadius: 6 }} />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ height = 120 }) => (
  <div className="card" style={{ height }}>
    <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
    <div className="skeleton" style={{ height: 40, width: '40%', marginBottom: 8 }} />
    <div className="skeleton" style={{ height: 14, width: '70%' }} />
  </div>
);

export default LoadingSkeleton;
