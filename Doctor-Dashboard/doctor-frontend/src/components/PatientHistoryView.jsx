import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './PatientHistoryView.css';

export default function PatientHistoryView({ patientId, patientName }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await api.getPatientHistory(patientId);
        if (res.success) {
          setHistory(res.history);
        }
      } catch (err) {
        console.error("Failed to load medical history:", err);
        setError("Failed to fetch medical history records.");
      } finally {
        setLoading(false);
      }
    };
    if (patientId) {
      const timer = setTimeout(() => {
        fetchHistory();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="loading-container" style={{ padding: '24px 0' }}>
        <span className="loading-spinner"></span>
        <p style={{ marginLeft: 12, color: 'var(--text-muted)', fontSize: 14 }}>Loading records...</p>
      </div>
    );
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="history-view-wrapper fade-in">
      <div className="history-header">
        <h4>Medical History: {patientName}</h4>
        <p className="history-count">Found {history.length} past consultations</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-history-state">
          <svg className="w-12 h-12 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No past completed consultations found for this patient.</p>
        </div>
      ) : (
        <div className="timeline-container">
          {history.map((record, index) => {
            const formattedDate = new Date(record.appointmentDate).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <div key={record._id || record.id || index} className="timeline-item">
                <div className="timeline-badge-dot"></div>
                <div className="timeline-content card">
                  <div className="timeline-meta flex justify-between items-center">
                    <span className="timeline-date font-semibold">{formattedDate}</span>
                    <span className="timeline-doctor">
                      Consultant: <span className="font-semibold">Dr. {record.doctor?.name || 'Unknown'}</span> ({record.doctor?.department || 'General'})
                    </span>
                  </div>

                  <div className="timeline-section-divider"></div>

                  <div className="timeline-body-grid">
                    {/* Symptoms & Vitals */}
                    <div className="history-vitals-block">
                      <h5 className="section-title">Symptoms & Vitals</h5>
                      <p className="symptom-text"><strong>Symptoms:</strong> {record.symptoms || record.vitals?.symptoms || 'None recorded'}</p>
                      
                      {record.vitals ? (
                        <div className="history-vitals-pills flex flex-wrap gap-2">
                          <span className="vitals-pill">BP: {record.vitals.bloodPressure?.systolic || '--'}/{record.vitals.bloodPressure?.diastolic || '--'} mmHg</span>
                          <span className="vitals-pill">HR: {record.vitals.pulseRate || '--'} bpm</span>
                          <span className="vitals-pill">Temp: {record.vitals.temperature || '--'} °C</span>
                          <span className="vitals-pill">SpO2: {record.vitals.spo2 || '--'}%</span>
                          <span className="vitals-pill">Wt: {record.vitals.weight || '--'} kg</span>
                          <span className="vitals-pill">BMI: {record.vitals.bmi || '--'}</span>
                        </div>
                      ) : (
                        <p className="text-light italic" style={{ fontSize: 13 }}>No vital stats recorded for this appointment.</p>
                      )}
                    </div>

                    {/* Diagnosis & Notes */}
                    <div className="history-diagnosis-block">
                      <h5 className="section-title">Diagnosis & Clinical Notes</h5>
                      <div className="diagnosis-box">
                        <strong>Diagnosis:</strong>
                        <p className="diagnosis-text">{record.diagnosis || 'No diagnosis recorded'}</p>
                      </div>
                      {record.clinicalNotes && (
                        <div className="notes-box">
                          <strong>Clinical Notes:</strong>
                          <p className="notes-text">{record.clinicalNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prescription */}
                  {record.prescription && record.prescription.length > 0 && (
                    <div className="history-prescription-block">
                      <h5 className="section-title">Prescribed Medicines</h5>
                      <div className="prescription-mini-table">
                        <table className="mini-table">
                          <thead>
                            <tr>
                              <th>Medicine</th>
                              <th>Dosage</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {record.prescription.map((med, mIdx) => (
                              <tr key={mIdx}>
                                <td className="font-semibold text-primary">{med.medicineName}</td>
                                <td>{med.dosage || '--'}</td>
                                <td>{med.frequency || '--'}</td>
                                <td>{med.duration || '--'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
