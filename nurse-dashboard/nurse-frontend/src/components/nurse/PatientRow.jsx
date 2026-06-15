import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const formatTime = (timeStr) => timeStr || '—';

const PatientRow = ({ appointment, onStatusChange }) => {
  const navigate = useNavigate();
  const { _id, tokenNumber, patient, doctor, department, appointmentTime, status, isEmergency, emergencyPriority } = appointment;

  return (
    <tr>
      <td>
        <span style={{
          fontWeight: 700, color: 'var(--primary-600)',
          fontFamily: 'monospace', fontSize: '0.875rem',
        }}>
          {tokenNumber}
        </span>
        {isEmergency && (
          <span className={`badge priority-${emergencyPriority}`} style={{ marginLeft: 6, fontSize: '0.65rem' }}>
            🚨
          </span>
        )}
      </td>
      <td>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
          {patient?.name || '—'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patient?.patientId}</div>
      </td>
      <td style={{ color: 'var(--text-secondary)' }}>{patient?.age || '—'}</td>
      <td>
        <span className={`badge ${patient?.gender === 'Male' ? 'badge-blue' : patient?.gender === 'Female' ? 'badge-purple' : 'badge-gray'}`}>
          {patient?.gender || '—'}
        </span>
      </td>
      <td>
        <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{doctor?.name || '—'}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{department}</div>
      </td>
      <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatTime(appointmentTime)}</td>
      <td><StatusBadge status={status} /></td>
      <td>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/appointment/${_id}`)}
          >View</button>
          {status === 'waiting_for_vitals' && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => navigate(`/vitals/${_id}`)}
            >Vitals</button>
          )}
          {status === 'checked_in' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onStatusChange?.(_id, 'waiting_for_vitals')}
            >Check In</button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default PatientRow;
