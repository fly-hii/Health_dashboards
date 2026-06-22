import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const STEPS = { EMAIL: 1, OTP: 2, PASSWORD: 3, SUCCESS: 4 };

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.EMAIL);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let t;
    if (countdown > 0) t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) return setError('Email is required');
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) return setError('Invalid email address');
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Failed to send OTP');
      setStep(STEPS.OTP);
      setCountdown(30);
    } catch { setError('Network error. Please check your connection.'); }
    finally { setSending(false); }
  };

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setCountdown(30); setOtp(['', '', '', '', '', '']); }
    } catch {} finally { setSending(false); }
  };

  const handleOtpChange = (val, idx) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) { const n = [...otp]; n[idx] = ''; setOtp(n); return; }
    const n = [...otp]; n[idx] = clean.slice(-1); setOtp(n);
    if (idx < 5) inputRefs[idx + 1].current?.focus();
  };
  const handleOtpKey = (e, idx) => {
    if (e.key === 'Backspace') {
      const n = [...otp];
      if (!n[idx] && idx > 0) { n[idx - 1] = ''; setOtp(n); inputRefs[idx - 1].current?.focus(); }
      else { n[idx] = ''; setOtp(n); }
    }
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (data.length === 6) { setOtp(data.split('')); inputRefs[5].current?.focus(); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return setError('Please enter all 6 digits');
    setVerifying(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Invalid OTP');
      setStep(STEPS.PASSWORD);
    } catch { setError('Network error. Please try again.'); }
    finally { setVerifying(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!password || password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setResetting(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.join(''), newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Failed to reset password');
      setStep(STEPS.SUCCESS);
    } catch { setError('Network error. Please try again.'); }
    finally { setResetting(false); }
  };

  const stepLabels = ['Enter Email', 'Verify OTP', 'New Password'];

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '460px', width: '100%' }}>
        {/* Accent bar */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--primary), #12B3A7)', borderRadius: '4px 4px 0 0', margin: '-32px -32px 24px' }} />

        {/* Step indicators */}
        {step < STEPS.SUCCESS && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {stepLabels.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700',
                    background: step >= i + 1 ? 'var(--primary)' : 'var(--surface2)',
                    color: step >= i + 1 ? '#fff' : 'var(--text-muted)',
                    boxShadow: step === i + 1 ? '0 0 0 4px rgba(var(--primary-rgb,15,155,142),0.15)' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: step === i + 1 ? 'var(--primary)' : 'var(--text-muted)' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ width: '32px', height: '2px', borderRadius: '2px', background: step > i + 1 ? 'var(--primary)' : 'var(--border)', marginBottom: '14px', transition: 'background 0.4s' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Back */}
        {step < STEPS.SUCCESS && (
          <button onClick={() => { if (step === STEPS.EMAIL) navigate('/login'); else setStep(s => s - 1); setError(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', marginBottom: '16px', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={16} />
            {step === STEPS.EMAIL ? 'Back to Login' : step === STEPS.OTP ? 'Change Email' : 'Re-verify OTP'}
          </button>
        )}

        {error && <div className="error-msg" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}

        {/* STEP 1 */}
        {step === STEPS.EMAIL && (
          <>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Forgot Password?</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>Enter your registered email to receive a 6-digit OTP.</p>
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="admin@careplus.com" style={{ paddingLeft: '42px' }} />
                </div>
              </div>
              <button type="submit" className="login-btn" disabled={sending}>
                {sending ? <span style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', verticalAlign: 'middle' }} /> : '📨 Send OTP'}
              </button>
            </form>
          </>
        )}

        {/* STEP 2 */}
        {step === STEPS.OTP && (
          <>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Verify OTP</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>We sent a 6-digit code to</p>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '20px' }}>{email}</p>
            <form onSubmit={handleVerifyOtp}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Enter 6-digit OTP</label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }} onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input key={idx} ref={inputRefs[idx]} type="text" maxLength={1} value={digit}
                    onChange={e => handleOtpChange(e.target.value, idx)} onKeyDown={e => handleOtpKey(e, idx)}
                    style={{ width: '42px', height: '48px', textAlign: 'center', fontWeight: '800', fontSize: '20px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: '10px', outline: 'none', color: 'var(--text-primary)', transition: 'all 0.15s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb,15,155,142),0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Didn't receive code?{' '}
                {countdown > 0
                  ? <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Resend in {countdown}s</span>
                  : <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: '700', fontSize: '13px' }}>{sending ? 'Sending…' : 'Resend OTP'}</button>
                }
              </p>
              <button type="submit" className="login-btn" disabled={verifying}>
                {verifying ? <span style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', verticalAlign: 'middle' }} /> : '🔐 Verify OTP'}
              </button>
            </form>
          </>
        )}

        {/* STEP 3 */}
        {step === STEPS.PASSWORD && (
          <>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Set New Password</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Create a strong password for your account.</p>
            <form onSubmit={handleReset}>
              {[
                { label: 'New Password', value: password, set: v => { setPassword(v); setError(''); }, show: showPwd, toggle: () => setShowPwd(v => !v) },
                { label: 'Confirm Password', value: confirm, set: v => { setConfirm(v); setError(''); }, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
              ].map(({ label, value, set, show, toggle }) => (
                <div className="form-group" key={label}>
                  <label>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type={show ? 'text' : 'password'} value={value} onChange={e => set(e.target.value)} placeholder="••••••••" style={{ paddingLeft: '42px', paddingRight: '42px' }} />
                    <button type="button" onClick={toggle} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" className="login-btn" disabled={resetting} style={{ marginTop: '4px' }}>
                {resetting ? <span style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', verticalAlign: 'middle' }} /> : '🔒 Reset Password'}
              </button>
            </form>
          </>
        )}

        {/* STEP 4 */}
        {step === STEPS.SUCCESS && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(var(--primary-rgb,15,155,142),0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary)' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Password Reset!</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>Your password has been reset successfully. You can now log in.</p>
            <button onClick={() => navigate('/login')} className="login-btn">🔑 Back to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}
