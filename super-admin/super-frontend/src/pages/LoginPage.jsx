import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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
    if (!form.email) {
      setError('Please enter email address to request OTP');
      return;
    }
    setError('');
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/auth/login-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to send OTP. Please try again.'); return; }
      setCountdown(30);
      setOtpSent(true);
    } catch (_) {
      setError('Network error. Could not send OTP. Please try again.');
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    let result;
    if (isOtpMode) {
      const combinedOtp = otp.join('');
      if (!form.email || combinedOtp.length !== 6) {
        setError('Please enter email and complete the 6-digit OTP code');
        return;
      }
      result = await login(form.email, undefined, combinedOtp);
    } else {
      if (!form.email || !form.password) {
        setError('Please enter email and password');
        return;
      }
      result = await login(form.email, form.password);
    }

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="icon">⚕️</div>
          <h1>CarePlus</h1>
          <p>Super Admin Control Panel</p>
        </div>

        {error && <div className="error-msg">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="admin@careplus.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          {!isOtpMode ? (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--primary)', fontWeight: '600', fontSize: '12px',
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!isOtpMode}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ margin: 0 }}>Verification Code</label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={countdown > 0}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: countdown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                    cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>

              {otpSent ? (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }} onPaste={handlePasteOtp}>
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
                        width: '38px',
                        height: '38px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        backgroundColor: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  padding: '16px 0',
                  border: '1px dashed var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface2)'
                }}>
                  Please request OTP code to verify your account
                </p>
              )}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '⏳ Logging in...' : isOtpMode ? '🔐 Verify & Login' : '🔐 Login to Dashboard'}
          </button>

          <button
            type="button"
            className="login-btn"
            onClick={() => {
              setIsOtpMode(!isOtpMode);
              setOtpSent(false);
              setOtp(['', '', '', '', '', '']);
              setError('');
            }}
            style={{
              marginTop: '12px',
              background: 'none',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
              boxShadow: 'none'
            }}
          >
            {isOtpMode ? 'Login with Password' : 'Login with OTP'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          CarePlus SaaS v2.0 · Super Admin Portal
        </p>
      </div>
    </div>
  );
}
