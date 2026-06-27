import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChangeOtpDigit = (value, index) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanValue.substring(cleanValue.length - 1);
    setOtp(newOtp);

    // Auto focus next box
    if (index < 5 && cleanValue) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDownOtp = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs[index - 1].current.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePasteOtp = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').substring(0, 6);
    if (pasteData.length === 6) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      inputRefs[5].current.focus();
    }
  };

  const handleSendOtp = async () => {
    if (!loginForm.email) {
      setError('Please enter doctor ID or email to request OTP');
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/auth/login-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to send OTP. Please try again.'); return; }
      setCountdown(30);
      setOtpSent(true);
      setSuccessMsg(data.message || 'OTP sent to your registered email!');
    } catch (_) {
      setError('Network error. Could not send OTP. Please try again.');
    }
  };


  const handleLoginChange = (e) => {
    setLoginForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
    setSuccessMsg('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (isOtpMode) {
      const combinedOtp = otp.join('');
      if (!loginForm.email || combinedOtp.length !== 6) {
        setError('Please fill in email and enter all 6 OTP digits');
        return;
      }
      setLoading(true);
      try {
        await login(loginForm.email, undefined, combinedOtp);
      } catch (err) {
        setError(err.message || 'Login failed. Check your credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!loginForm.email || !loginForm.password) {
        setError('Please fill in all fields');
        return;
      }
      setLoading(true);
      try {
        await login(loginForm.email, loginForm.password);
      } catch (err) {
        setError(err.message || 'Login failed. Check your credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-portal-container fade-in">
      <div className="auth-split-wrapper">
        
        {/* Left Column: Hospital Info Panel */}
        <div className="info-panel-side">
          <div className="info-panel-overlay"></div>
          <div className="info-panel-content">
            <div className="brand-logo-area">
              <div className="logo-box">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="logo-title">{import.meta.env.VITE_HOSPITAL_NAME || 'CarePlus'} <span className="logo-subtitle">{import.meta.env.VITE_HOSPITAL_SUBTITLE || 'HOSPITAL'}</span></span>
            </div>

            <div className="benefit-intro-section">
              <h2>Doctor Login</h2>
              <p className="intro-desc">
                Welcome back! Please login to your clinical doctor account.
              </p>
            </div>

            {/* List of Benefits */}
            <div className="benefits-list">
              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Consultations</h4>
                  <p>Manage and view your consultations</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Prescriptions</h4>
                  <p>Create and manage patient prescriptions</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Patient Records</h4>
                  <p>Access patient history and consultation documents</p>
                </div>
              </div>
            </div>

            {/* Bottom Card */}
            <div className="banner-ad-card">
              <div className="ad-icon">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.9L10 9.715l7.834-4.816A2 2 0 0016 3H4a2 2 0 00-1.834 1.9zM18 7.378l-7.464 4.593a1 1 0 01-1.072 0L2 7.378V15a2 2 0 002 2h12a2 2 0 002-2V7.378z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ad-text">
                <h5>Your Health, Our Priority</h5>
                <p>Collaborate to manage clinical outcomes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form Area */}
        <div className="form-panel-side">
          <div className="auth-card card slide-up">
            
            {/* Round Avatar Icon Header */}
            <div className="round-avatar-header">
              <div className="avatar-circle">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-theme" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3>Login to your account</h3>
              <p className="avatar-subtext">Please enter credentials to continue</p>
            </div>

            {error && <div className="auth-alert alert-error fade-in">{error}</div>}
            {successMsg && <div className="auth-alert alert-success fade-in">{successMsg}</div>}

            <form onSubmit={handleLoginSubmit} className="auth-form flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Doctor ID or Email</label>
                <div className="input-icon-wrapper">
                  <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.378 0 2.4-1.1 3-2.5M12 14a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="text"
                    name="email"
                    className="form-input"
                    placeholder="Enter your doctor ID or email"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    required
                  />
                </div>
              </div>

              {/* Password / OTP */}
              {!isOtpMode ? (
                <div className="form-group">
                  <div className="flex justify-between items-center">
                    <label className="form-label">Password</label>
                    <a href="#forgot" className="forgot-pass-link" onClick={(e) => { e.preventDefault(); window.location.href = '/forgot-password'; }}>Forgot Password?</a>
                  </div>
                  <div className="input-icon-wrapper">
                    <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className="form-input"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label">Verification Code</label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={countdown > 0}
                      className="forgot-pass-link"
                      style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>

                  {otpSent ? (
                    <div className="flex gap-2 justify-center items-center py-2" onPaste={handlePasteOtp}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={inputRefs[idx]}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleChangeOtpDigit(e.target.value, idx)}
                          onKeyDown={(e) => handleKeyDownOtp(e, idx)}
                          disabled={loading}
                          style={{
                            width: '40px',
                            height: '40px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'all 0.15s'
                          }}
                          className="form-input-otp-box"
                        />
                      ))}
                    </div>
                  ) : (
                    <p style={{
                      fontSize: '12.5px',
                      color: '#64748b',
                      textAlign: 'center',
                      padding: '16px 0',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc'
                    }}>
                      Please request OTP code to verify your account
                    </p>
                  )}
                </div>
              )}

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                {loading ? <span className="loading-spinner-small"></span> : isOtpMode ? 'Verify & Login' : 'Login'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsOtpMode(!isOtpMode);
                  setOtpSent(false);
                  setOtp(['', '', '', '', '', '']);
                  setError('');
                  setSuccessMsg('');
                }}
              >
                {isOtpMode ? 'Login with Password' : 'Login with OTP'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '13.5px', color: '#64748b', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span>Need help?</span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-theme" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle', color: 'var(--theme-primary)' }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <a href="mailto:support@hospital.com" className="support-link" onClick={(e) => { e.preventDefault(); console.log("Contact support at support@hospital.com"); }} style={{ color: 'var(--theme-primary)', fontWeight: '600', textDecoration: 'none' }}>
                  Contact IT Support
                </a>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
