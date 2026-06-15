const STATUS_MAP = {
  checked_in:         { label: 'Checked In',       cls: 'status-checked_in' },
  waiting_for_vitals: { label: 'Waiting for Vitals', cls: 'status-waiting_for_vitals' },
  vitals_done:        { label: 'Vitals Done',       cls: 'status-vitals_done' },
  with_doctor:        { label: 'With Doctor',       cls: 'status-with_doctor' },
  consultation_done:  { label: 'Consultation Done', cls: 'status-consultation_done' },
  cancelled:          { label: 'Cancelled',         cls: 'status-cancelled' },
};

const PRIORITY_MAP = {
  critical: { label: 'Critical', cls: 'priority-critical' },
  high:     { label: 'High',     cls: 'priority-high' },
  medium:   { label: 'Medium',   cls: 'priority-medium' },
  low:      { label: 'Low',      cls: 'priority-low' },
};

const StatusBadge = ({ status, type = 'status' }) => {
  const map  = type === 'priority' ? PRIORITY_MAP : STATUS_MAP;
  const info = map[status] || { label: status || '—', cls: 'badge-gray' };

  return <span className={`badge ${info.cls}`}>{info.label}</span>;
};

export default StatusBadge;
