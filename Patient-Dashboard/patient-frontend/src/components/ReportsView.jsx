import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { toast } from '../utils/toast';
import './ReportsView.css';

// Premium custom inline SVG icons matching Lucide exactly with explicit fallback sizing for non-Tailwind compatibility
const FileTextIcon = ({ className = "w-6 h-6", width = 24, height = 24 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

const DownloadIcon = ({ className = "w-5 h-5", width = 20, height = 20 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4", width = 16, height = 16 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4", width = 16, height = 16 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

const UploadIcon = ({ className = "w-6 h-6", width = 24, height = 24 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

const XIcon = ({ className = "w-5 h-5", width = 20, height = 20 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4", width = 16, height = 16 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5", width = 20, height = 20 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const FolderIcon = ({ className = "w-8 h-8", width = 32, height = 32 }) => (
  <svg className={className} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);

// Color-coded file icons matching the doctor dashboard reports theme
const getIconClassStyle = (type, name) => {
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('sugar') || lowerName.includes('blood') || lowerName.includes('cbc') || lowerName.includes('test')) {
    return 'report-icon-wrapper icon-orange';
  }
  if (lowerName.includes('lipid') || lowerName.includes('cholesterol')) {
    return 'report-icon-wrapper icon-blue';
  }
  if (lowerName.includes('ecg') || lowerName.includes('electrocardiogram') || lowerName.includes('analysis') || lowerName.includes('report')) {
    if (lowerName.includes('ecg') || lowerName.includes('electrocardiogram')) {
      return 'report-icon-wrapper icon-green';
    }
  }
  if (lowerName.includes('x-ray') || lowerName.includes('chest') || lowerName.includes('imaging') || lowerName.includes('mri') || lowerName.includes('scan') || lowerName.includes('ultrasound')) {
    return 'report-icon-wrapper icon-sky';
  }
  if (lowerName.includes('echo') || lowerName.includes('tmt') || lowerName.includes('cardiography')) {
    return 'report-icon-wrapper icon-purple';
  }
  
  // Default fallbacks based on category
  const cat = (type || '').toLowerCase();
  if (cat.includes('lab')) {
    return 'report-icon-wrapper icon-orange';
  }
  if (cat.includes('imag')) {
    return 'report-icon-wrapper icon-sky';
  }
  return 'report-icon-wrapper icon-green';
};

// Portal-based modal preview overlay incorporating patient / practitioner summary banners
function ReportPreviewModal({ report, profile, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const fileUrl = report.fileUrl || `/api/patient/reports/download/${report._id || report.id}`;
  const isPDF = fileUrl.toLowerCase().includes('.pdf');

  return createPortal(
    <div className="preview-modal-backdrop" onClick={onClose}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-header">
          <div className="text-left">
            <h3>{report.reportName || report.name}</h3>
            <p>Uploaded on {report.reportDate || report.date} &bull; Size: {report.fileSize || report.size}</p>
          </div>
          <button onClick={onClose} className="preview-close-btn-circle" title="Close">
            <XIcon />
          </button>
        </div>

        <div className="preview-modal-body">
          {/* Uploader / Patient Details banner */}
          {report.doctor ? (
            <div className="preview-info-banner">
              <div className="preview-info-avatar">
                <UserIcon />
              </div>
              <div className="preview-info-text text-left">
                <span className="preview-info-title">Dr. {report.doctor}</span>
                <p className="preview-info-subtitle">
                  Department: {report.department || 'General Medicine'} &bull; Clinical Practitioner
                </p>
              </div>
            </div>
          ) : (
            <div className="preview-info-banner">
              <div className="preview-info-avatar">
                <UserIcon />
              </div>
              <div className="preview-info-text text-left">
                <span className="preview-info-title">{profile?.fullName || profile?.name || 'Patient'}</span>
                <p className="preview-info-subtitle">
                  ID: {profile?.patientId || 'N/A'} &bull; Age: {profile?.age || 'N/A'} &bull; Gender: {profile?.gender || 'N/A'} (Self Uploaded)
                </p>
              </div>
            </div>
          )}

          {/* File Preview Viewer */}
          <div className="preview-file-viewer">
            {isPDF ? (
              <object
                data={fileUrl}
                type="application/pdf"
                style={{ width: '100%', height: '100%', minHeight: '450px' }}
              >
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileTextIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">PDF Viewer is not supported in this browser.</p>
                  <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ color: '#0F9D8A', fontWeight: 'bold', textDecoration: 'underline', marginTop: '10px', display: 'inline-block' }}
                  >
                    Open PDF in new tab
                  </a>
                </div>
              </object>
            ) : (
              <img 
                src={fileUrl} 
                alt={report.reportName || report.name}
              />
            )}
          </div>
        </div>

        <div className="preview-modal-footer">
          <button 
            onClick={onClose} 
            className="btn btn-secondary"
            style={{ fontWeight: '700', borderRadius: '12px', padding: '10px 20px' }}
          >
            Close
          </button>
          <a 
            href={fileUrl}
            download
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0F9D8A', borderColor: '#0F9D8A', color: 'white', fontWeight: '700', borderRadius: '12px', padding: '10px 20px' }}
          >
            <DownloadIcon /> Download File
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ReportsView({ reports, profile, onUploadSuccess }) {
  // Tabs & Searching States
  const [activeSubTab, setActiveSubTab] = useState('All Reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // File Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [customReportName, setCustomReportName] = useState('');
  const [reportCategory, setReportCategory] = useState('lab');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // File Preview Portal Modal
  const [previewingReport, setPreviewingReport] = useState(null);

  const fileInputRef = useRef(null);

  // Drag over handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    // Check size: Max 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File is too large! Maximum allowed size is 10MB.");
      return;
    }

    // Check extension: PDF, JPG, JPEG, PNG
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported format! Please upload PDF, JPG, or PNG.");
      return;
    }

    setUploadFile(file);
    setCustomReportName(file.name.replace(/\.[^/.]+$/, ""));
  };

  // Submit file upload
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadProgress(15);

    const formData = new FormData();
    formData.append('reportName', customReportName.trim() || uploadFile.name.split('.')[0]);
    // Category mapping matching patient-backend values ('Lab Reports', 'Imaging', 'Others')
    let categoryValue = 'Lab Reports';
    if (reportCategory === 'imaging') categoryValue = 'Imaging';
    else if (reportCategory === 'others') categoryValue = 'Others';
    formData.append('category', categoryValue);
    formData.append('file', uploadFile);

    // Simulated progress loader
    const timer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 85) {
          clearInterval(timer);
          return 85;
        }
        return prev + 15;
      });
    }, 100);

    api.uploadPatientReport(formData)
      .then(() => {
        clearInterval(timer);
        setUploadProgress(100);
        setTimeout(() => {
          toast.success("Medical document uploaded successfully!");
          setUploadFile(null);
          setCustomReportName('');
          onUploadSuccess(); // Reload reports list
        }, 300);
      })
      .catch(err => toast.error("Upload failed: " + err.message))
      .finally(() => {
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 400);
      });
  };

  // Delete Report
  const handleDeleteReport = (id) => {
    if (!window.confirm("Are you sure you want to delete this report? This action is permanent.")) {
      return;
    }

    api.deletePatientReport(id)
      .then(() => {
        toast.success("Report deleted successfully.");
        onUploadSuccess(); // Refresh
      })
      .catch(err => toast.error("Failed to delete report: " + err.message));
  };

  // Trigger file download
  const handleDownload = (rep) => {
    const fileUrl = rep.fileUrl || `/api/patient/reports/download/${rep._id || rep.id}`;
    window.open(fileUrl);
  };

  // Dynamic filter logic checking both category text and reportType database fields
  const filteredReports = reports.filter(rep => {
    // 1. Tab category filter matching
    const category = rep.category || rep.reportType || '';
    const categoryLower = category.toLowerCase();
    const typeLower = (rep.reportType || '').toLowerCase();

    if (activeSubTab === 'Lab Reports') {
      if (!categoryLower.includes('lab') && typeLower !== 'lab') return false;
    }
    if (activeSubTab === 'Imaging') {
      if (!categoryLower.includes('imag') && typeLower !== 'imaging') return false;
    }
    if (activeSubTab === 'Others') {
      if (categoryLower.includes('lab') || typeLower === 'lab' || categoryLower.includes('imag') || typeLower === 'imaging') return false;
    }

    // 2. Search query matching (Report name, category type)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (rep.reportName || rep.name || '').toLowerCase();
      const cat = categoryLower;
      if (!name.includes(q) && !cat.includes(q)) return false;
    }

    // 3. Dropdown Category matching
    if (typeFilter !== 'all') {
      if (typeFilter === 'lab' && !categoryLower.includes('lab') && typeLower !== 'lab') return false;
      if (typeFilter === 'imaging' && !categoryLower.includes('imag') && typeLower !== 'imaging') return false;
      if (typeFilter === 'others' && (categoryLower.includes('lab') || typeLower === 'lab' || categoryLower.includes('imag') || typeLower === 'imaging')) return false;
    }

    // 4. Date filter matching
    if (dateFilter) {
      const formattedDate = rep.createdAt ? new Date(rep.createdAt).toISOString().split('T')[0] : '';
      const repDate = rep.reportDate || rep.date || '';
      if (!formattedDate.includes(dateFilter) && !repDate.includes(dateFilter)) return false;
    }

    return true;
  });

  return (
    <div className="reports-view">
      
      {/* Header title */}
      <div className="view-header">
        <h1 className="title">Reports</h1>
        <p className="subtitle">Upload and view your medical test reports.</p>
      </div>

      {/* Sub Filter controls: Search and Specific Type/Date controls */}
      <div className="reports-filter-bar">
        <div className="filter-search-wrapper">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search in reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-search-input font-semibold"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="filter-select font-semibold"
        >
          <option value="all">All Categories</option>
          <option value="lab">Lab Reports</option>
          <option value="imaging">Imaging</option>
          <option value="others">Others</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="filter-date font-semibold"
        />
      </div>

      {/* Categories Tab selectors */}
      <div className="sub-tabs">
        {['All Reports', 'Lab Reports', 'Imaging', 'Others'].map(tab => (
          <button 
            key={tab}
            className={`sub-tab-btn ${activeSubTab === tab ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid of cards */}
      {filteredReports.length === 0 ? (
        <div className="no-reports-box">
          <FolderIcon />
          <p className="no-reports-text">No reports available in this category.</p>
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map((rep) => {
            const reportNameStr = rep.reportName || rep.name || 'Report';
            const reportTypeStr = rep.reportType || rep.category || 'others';
            const iconClass = getIconClassStyle(reportTypeStr, reportNameStr);
            
            return (
              <div key={rep.id || rep._id} className="report-card-premium">
                <div className="report-card-content">
                  <div className={iconClass}>
                    <FileTextIcon />
                  </div>
                  <div className="report-header-text">
                    <h4 className="report-title-txt" title={reportNameStr}>{reportNameStr}</h4>
                    <p className="report-date-txt">{rep.reportDate || rep.date}</p>
                  </div>
                  <button 
                    onClick={() => handleDownload(rep)}
                    className="report-download-btn-circle"
                    title="Download document file"
                  >
                    <DownloadIcon />
                  </button>
                </div>

                {/* Actions strip */}
                <div className="report-actions-strip">
                  <span className="report-action-link" onClick={() => setPreviewingReport(rep)}>
                    <EyeIcon /> View
                  </span>
                  <span className="report-action-link" onClick={() => setPreviewingReport(rep)}>
                    <FileTextIcon className="w-3.5 h-3.5" width={14} height={14} /> Preview PDF
                  </span>
                  <span className="report-action-link delete-link" onClick={() => handleDeleteReport(rep.id || rep._id)}>
                    <TrashIcon /> Delete
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Drag & Drop bottom zone */}
      <div className="upload-container-bottom">
        <h4>Upload New Report</h4>
        
        <div className="flex flex-col gap-4">
          
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`drag-drop-zone-premium ${isDragging ? 'drag-active' : ''}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              style={{ display: 'none' }} 
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <div className="upload-icon-circle">
              <UploadIcon />
            </div>
            <h5>Drag & drop files here or click to browse</h5>
            <p>PDF, JPG, PNG up to 10MB</p>
          </div>

          {/* Selected File inputs overlay panel */}
          {uploadFile && (
            <form onSubmit={handleUploadSubmit} className="selected-file-panel">
              
              <div className="selected-file-header">
                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                  <FileTextIcon />
                </div>
                <div className="selected-file-header-text">
                  <span className="selected-file-name">{uploadFile.name}</span>
                  <span className="selected-file-size">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setUploadFile(null)} 
                  className="remove-file-btn"
                >
                  <XIcon />
                </button>
              </div>

              <div className="selected-file-inputs">
                <div className="upload-input-group">
                  <label className="upload-input-label">Report File Name</label>
                  <input 
                    type="text" 
                    className="form-input font-semibold" 
                    value={customReportName}
                    onChange={(e) => setCustomReportName(e.target.value)}
                    required
                  />
                </div>

                <div className="upload-input-group">
                  <label className="upload-input-label">Category</label>
                  <select 
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="form-select font-semibold"
                  >
                    <option value="lab">Lab Report</option>
                    <option value="imaging">Imaging (X-Ray, MRI, Ultrasound)</option>
                    <option value="others">Others</option>
                  </select>
                </div>
              </div>

              {/* Progress loading bar */}
              {uploading && (
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <button 
                type="submit" 
                className="btn-upload-submit"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="spinner-btn" />
                    Uploading document ({uploadProgress}%)
                  </>
                ) : (
                  <>
                    <UploadIcon /> Upload Document
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* PDF Portal Previewer */}
      {previewingReport && (
        <ReportPreviewModal 
          report={previewingReport} 
          profile={profile}
          onClose={() => setPreviewingReport(null)} 
        />
      )}

    </div>
  );
}
