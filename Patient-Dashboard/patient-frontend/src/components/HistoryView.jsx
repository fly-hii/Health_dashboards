import React, { useState } from 'react';
import './HistoryView.css';

export default function HistoryView({ history }) {
  const [selectedEntry, setSelectedEntry] = useState(null);

  return (
    <div className="history-view slide-up">
      <div className="view-header">
        <h1 className="title">Medical History</h1>
        <p className="subtitle">Your health journey and past consultations.</p>
      </div>

      <div className="history-content-layout">
        {/* Timeline List */}
        <div className="timeline-container flex flex-col">
          {history.length === 0 ? (
            <div className="card text-center p-8">
              <p className="no-history-text">No consultation records available.</p>
            </div>
          ) : (
            history.map((item, index) => (
              <div key={index} className="timeline-node flex">
                {/* Left side date */}
                <div className="timeline-date-side text-right">
                  <span className="timeline-date-label">{item.date}</span>
                </div>

                {/* Center line with dot */}
                <div className="timeline-line-separator">
                  <div className="timeline-dot"></div>
                  {index < history.length - 1 && <div className="timeline-vertical-line"></div>}
                </div>

                {/* Right side content card */}
                <div className="timeline-card-side">
                  <div className="card timeline-entry-card text-left">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="entry-doctor font-semibold">{item.doctor}</h4>
                        <span className="entry-dept-badge">{item.department}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedEntry(item)} 
                        className="btn btn-secondary btn-sm"
                      >
                        View Details
                      </button>
                    </div>

                    <div className="entry-body mt-3">
                      <div className="diagnosis-row flex gap-2">
                        <span className="label-bold">Diagnosis:</span>
                        <span className="val-text">{item.diagnosis}</span>
                      </div>
                      <p className="entry-notes mt-2">{item.notes}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Entry Detail Sidebar Modal Overlay */}
        {selectedEntry && (
          <div className="modal-overlay flex items-center justify-center fade-in">
            <div className="modal-content card slide-up">
              <div className="modal-header flex justify-between items-center mb-4">
                <h3>Consultation Record</h3>
                <button onClick={() => setSelectedEntry(null)} className="close-modal-btn">&times;</button>
              </div>

              <div className="modal-body flex flex-col gap-4">
                <div className="receipt-row-history">
                  <span className="lbl font-medium text-muted">Consultation Date</span>
                  <span className="val font-semibold">{selectedEntry.date}</span>
                </div>
                <div className="receipt-row-history">
                  <span className="lbl font-medium text-muted">Consulting Doctor</span>
                  <span className="val font-semibold">{selectedEntry.doctor}</span>
                </div>
                <div className="receipt-row-history">
                  <span className="lbl font-medium text-muted">Specialty Department</span>
                  <span className="val">{selectedEntry.department}</span>
                </div>
                <div className="receipt-row-history">
                  <span className="lbl font-medium text-muted">Primary Diagnosis</span>
                  <span className="val text-danger font-semibold">{selectedEntry.diagnosis}</span>
                </div>

                <div className="notes-box-details mt-2">
                  <h5 className="text-primary font-bold mb-2">Doctor's Clinical Notes</h5>
                  <p className="clinical-notes-txt">{selectedEntry.notes}</p>
                </div>

                <div className="recommendations-box">
                  <h5 className="text-success font-bold mb-2">Standard Care Plan</h5>
                  <ul className="care-plan-list">
                    <li>Follow medication doses strictly.</li>
                    <li>Schedule review in case symptoms persist.</li>
                    <li>Avoid foods triggers and stay hydrated.</li>
                  </ul>
                </div>
              </div>

              <div className="modal-footer flex justify-end mt-6">
                <button onClick={() => setSelectedEntry(null)} className="btn btn-primary">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
