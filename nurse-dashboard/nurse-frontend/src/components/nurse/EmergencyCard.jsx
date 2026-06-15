import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const PRIORITY_COLORS = {
  critical: { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', glow: 'rgba(239,68,68,0.2)' },
  high:     { bg: '#ffedd5', border: '#fdba74', text: '#ea580c', glow: 'rgba(249,115,22,0.2)' },
  medium:   { bg: '#fef9c3', border: '#fde047', text: '#ca8a04', glow: 'rgba(234,179,8,0.2)' },
  low:      { bg: '#dcfce7', border: '#86efac', text: '#16a34a', glow: 'rgba(34,197,94,0.2)' },
};

const EmergencyCard = ({ appointment }) => {
  const navigate  = useNavigate();
  const priority  = appointment.emergencyPriority || 'low';
  const colors    = PRIORITY_COLORS[priority] || PRIORITY_COLORS.low;
  const { patient, doctor, department, symptoms, appointmentTime, status, vitals, _id } = appointment;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `2px solid ${colors.border}`,
      borderRadius: 14,
      padding: '18px 20px',
      transition: 'all 0.2s',
      boxShadow: `0 4px 20px ${colors.glow}`,
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${colors.glow}`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${colors.glow}`; }}
    >
      {/* Priority stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 4, background: colors.text,
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, marginTop: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {patient?.name || 'Unknown'}
            </span>
            {priority === 'critical' && (
              <span style={{ animation: 'pulse-ring 1.5s infinite', display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors.text }} />
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {patient?.patientId} • {patient?.age}y • {patient?.gender}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
          <StatusBadge status={priority} type="priority" />
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Symptoms */}
      {symptoms && (
        <div style={{
          background: colors.bg,
          borderRadius: 8, padding: '8px 12px',
          marginBottom: 12, border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.text, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Symptoms</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{symptoms}</div>
        </div>
      )}

      {/* Vitals Summary */}
      {vitals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'BP', value: vitals.bloodPressure ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}` : '—', unit: 'mmHg' },
            { label: 'Pulse', value: vitals.pulseRate || '—', unit: 'bpm' },
            { label: 'SpO2', value: vitals.spo2 ? `${vitals.spo2}%` : '—', unit: '' },
          ].map((v) => (
            <div key={v.label} style={{ textAlign: 'center', background: 'var(--bg-primary)', borderRadius: 8, padding: '6px 4px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 2 }}>{v.label}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{v.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doctor?.name} • {department}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appointmentTime}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/appointment/${_id}`)}>View</button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/vitals/${_id}`)}>Vitals</button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyCard;
