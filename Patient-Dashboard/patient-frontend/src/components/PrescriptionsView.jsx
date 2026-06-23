import React, { useState } from 'react';
import { toast } from '../utils/toast';
import './PrescriptionsView.css';

export default function PrescriptionsView({ prescriptions }) {
  const [selectedPresc, setSelectedPresc] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = (presc, e) => {
    e.stopPropagation();
    setDownloadingId(presc.id);
    // Simulate a download delay
    setTimeout(() => {
      setDownloadingId(null);
      toast.success(`Prescription ${presc.id} PDF downloaded successfully!`);
    }, 1000);
  };

  return (
    <div className="prescriptions-view slide-up">
      <div className="view-header">
        <h1 className="title">Prescriptions</h1>
        <p className="subtitle">View and download your active and historical doctor prescriptions.</p>
      </div>

      {/* Prescriptions Table */}
      <div className="card table-card">
        {prescriptions.length === 0 ? (
          <p className="no-presc-text text-center">No prescriptions found.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Prescription ID</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Medicines</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((presc) => (
                  <tr key={presc.id} onClick={() => setSelectedPresc(presc)} className="interactive-row">
                    <td className="font-semibold text-primary">{presc.id}</td>
                    <td>{presc.doctor?.name || presc.doctor}</td>
                    <td>{presc.date}</td>
                    <td>{presc.medicineCount || presc.medicines.length} Medicines</td>
                    <td className="flex gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedPresc(presc); }} 
                        className="action-btn-link text-primary"
                      >
                        View
                      </button>
                      <button 
                        onClick={(e) => handleDownload(presc, e)} 
                        className="action-btn-link text-success"
                        disabled={downloadingId === presc.id}
                      >
                        {downloadingId === presc.id ? 'Downloading...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pharmacy Note Warning Banner */}
      <div className="card pharmacy-warning-banner flex items-center justify-between">
        <div className="flex items-center gap-4 text-left">
          <div className="pharmacy-icon-wrapper">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h4 className="banner-title">Pharmacy Pickup Instructions</h4>
            <p className="banner-desc">
              Please show this prescription QR / PDF at the hospital pharmacy counter to collect your medicines.
            </p>
          </div>
        </div>

        <div className="pharmacy-bottles-art">
          {/* Simple medicine illustration badge */}
          <div className="pill-bottle"></div>
          <div className="pill-capsule"></div>
        </div>
      </div>

      {/* Detailed Prescription Modal */}
      {selectedPresc && (
        <div className="modal-overlay flex items-center justify-center fade-in">
          <div className="modal-content card slide-up">
            <div className="modal-header flex justify-between items-center mb-4">
              <h3>Prescription Summary</h3>
              <button onClick={() => setSelectedPresc(null)} className="close-modal-btn">&times;</button>
            </div>

            <div className="modal-body flex flex-col gap-4">
              <div className="receipt-row">
                <span className="lbl font-medium text-muted">ID</span>
                <span className="val font-semibold">{selectedPresc.id}</span>
              </div>
              <div className="receipt-row">
                <span className="lbl font-medium text-muted">Doctor</span>
                <span className="val">{selectedPresc.doctor?.name || selectedPresc.doctor}</span>
              </div>
              <div className="receipt-row">
                <span className="lbl font-medium text-muted">Date Issued</span>
                <span className="val">{selectedPresc.date}</span>
              </div>

              <div className="medicine-prescribed-list-box mt-2">
                <h5 className="text-primary font-bold mb-2">Prescribed Medicines</h5>
                <div className="med-list">
                  {selectedPresc.medicines.map((med, idx) => (
                    <div key={idx} className="med-item flex items-center gap-3">
                      <div className="bullet-dot"></div>
                      <span className="med-text font-medium">{med}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="notes-box-details">
                <h5>Directions</h5>
                <p className="clinical-notes-txt">
                  Take medicines strictly as directed. Do not self-modify clinical dosages. Maintain a copy of this prescription file.
                </p>
              </div>
            </div>

            <div className="modal-footer flex justify-between mt-6">
              <button 
                onClick={(e) => handleDownload(selectedPresc, e)} 
                className="btn btn-secondary"
                disabled={downloadingId === selectedPresc.id}
              >
                {downloadingId === selectedPresc.id ? 'Downloading...' : 'Download PDF'}
              </button>
              <button onClick={() => setSelectedPresc(null)} className="btn btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
