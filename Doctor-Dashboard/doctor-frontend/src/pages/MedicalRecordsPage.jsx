import React, { useState } from 'react';
import MedicalRecordsList from '../components/MedicalRecordsList';
import PatientMedicalHistory from '../components/PatientMedicalHistory';
import MedicalRecordDetails from '../components/MedicalRecordDetails';

export default function MedicalRecordsPage() {
  const [view, setView] = useState('list'); // 'list', 'patient', 'details'
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  const handleViewPatient = (patientId) => {
    setSelectedPatientId(patientId);
    setView('patient');
  };

  const handleViewRecord = (recordId) => {
    setSelectedRecordId(recordId);
    setView('details');
  };

  const handleBackToList = () => {
    setSelectedPatientId(null);
    setSelectedRecordId(null);
    setView('list');
  };

  const handleBackToPatient = () => {
    setSelectedRecordId(null);
    setView('patient');
  };

  if (view === 'details' && selectedRecordId) {
    return <MedicalRecordDetails recordId={selectedRecordId} onBack={selectedPatientId ? handleBackToPatient : handleBackToList} />;
  }

  if (view === 'patient' && selectedPatientId) {
    return <PatientMedicalHistory patientId={selectedPatientId} onBack={handleBackToList} onViewRecord={handleViewRecord} />;
  }

  return <MedicalRecordsList onViewPatient={handleViewPatient} onViewRecord={handleViewRecord} />;
}
