import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import './LoginPage.css';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
const STEPS = { EMAIL: 1, OTP: 2, PASSWORD: 3, SUCCESS: 4 };

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(STEPS.EMAIL);

  // Step 1
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);

  // Step 2 – OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Step 3 – New Password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let t;
    if (countdown > 0) t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Step 1: Send OTP ──
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setEmailError('');
    if (!email) return setEmailError('Email is required');
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) return setEmailError('Invalid email address');
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return setEmailError(data.message || 'Failed to send OTP');
      setStep(STEPS.OTP);
      setCountdown(30);
    } catch {
      setEmailError('Network error. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setCountdown(30); setOtp(['', '', '', '', '', '']); }
    } catch {}
    finally { setSending(false); }
  };

  // ── OTP input handlers ──
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

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return setOtpError('Please enter all 6 digits');
    setVerifying(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) return setOtpError(data.message || 'Invalid OTP');
      setStep(STEPS.PASSWORD);
    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // ── Step 3: Reset Password ──
  const handleReset = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (!password || password.length < 6) return setPwdError('Password must be at least 6 characters');
    if (password !== confirm) return setPwdError('Passwords do not match');
    setResetting(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.join(''), newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) return setPwdError(data.message || 'Failed to reset password');
      setStep(STEPS.SUCCESS);
    } catch {
      setPwdError('Network error. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const handleBack = () => {
    if (step === STEPS.EMAIL) window.history.back();
    else if (step === STEPS.OTP) setStep(STEPS.EMAIL);
    else if (step === STEPS.PASSWORD) setStep(STEPS.OTP);
  };

  const stepLabels = ['Enter Email', 'Verify OTP', 'New Password'];

  return (
    <div className="auth-portal-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{
          width: '100%', maxWidth: '460px', background: '#fff',
          borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden', margin: '24px',
        }}>
          {/* Accent bar */}
          <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--theme-primary,#0F9B8E), #12B3A7)' }} />

          <div style={{ padding: '36px 40px' }}>
            {/* Step indicators */}
            {step < STEPS.SUCCESS && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                {stepLabels.map((label, i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '700',
                        background: step > i + 1 ? 'var(--theme-primary,#0F9B8E)' : step === i + 1 ? 'var(--theme-primary,#0F9B8E)' : '#f1f5f9',
                        color: step >= i + 1 ? '#fff' : '#94a3b8',
                        boxShadow: step === i + 1 ? '0 0 0 4px rgba(15,155,142,0.15)' : 'none',
                        transition: 'all 0.3s',
                      }}>
                        {step > i + 1 ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: step === i + 1 ? 'var(--theme-primary,#0F9B8E)' : '#94a3b8' }}>{label}</span>
                    </div>
                    {i < 2 && <div style={{ width: '36px', height: '2px', borderRadius: '2px', background: step > i + 1 ? 'var(--theme-primary,#0F9B8E)' : '#e2e8f0', marginBottom: '16px', transition: 'background 0.4s' }} />}
                  </div>
                ))}
              </div>
            )}

            {/* Back button */}
            {step < STEPS.SUCCESS && (
              <button onClick={handleBack} style={{
                display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
                cursor: 'pointer', color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '20px', padding: 0,
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-primary,#0F9B8E)'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >
                <ArrowLeft size={16} />
                {step === STEPS.EMAIL ? 'Back to Login' : step === STEPS.OTP ? 'Change Email' : 'Re-verify OTP'}
              </button>
            )}

            {/* ── STEP 1: Email ── */}
            {step === STEPS.EMAIL && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Forgot Password?</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
                  Enter your registered email and we'll send you a 6-digit OTP to verify your identity.
                </p>
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} placeholder="Enter your email address"
                        style={{ width: '100%', paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px', background: '#f8fafc', border: `1.5px solid ${emailError ? '#ef4444' : '#e2e8f0'}`, borderRadius: '14px', fontSize: '14px', color: '#1e293b', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                        onFocus={e => { e.target.style.borderColor = 'var(--theme-primary,#0F9B8E)'; e.target.style.boxShadow = '0 0 0 4px rgba(15,155,142,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = emailError ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    {emailError && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', fontWeight: '600', marginTop: '8px' }}><AlertCircle size={14} /> {emailError}</span>}
                  </div>
                  <button type="submit" disabled={sending} style={{
                    width: '100%', padding: '16px', background: 'linear-gradient(135deg, var(--theme-primary,#0F9B8E), #12B3A7)',
                    color: '#fff', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '14px', cursor: sending ? 'not-allowed' : 'pointer',
                    opacity: sending ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.15s',
                  }}
                    onMouseEnter={e => { if (!sending) e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {sending ? <span style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : 'Send OTP'}
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === STEPS.OTP && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>Verify OTP</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>We sent a 6-digit code to</p>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--theme-primary,#0F9B8E)', marginBottom: '24px' }}>{email}</p>
                <form onSubmit={handleVerifyOtp}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Enter 6-digit OTP</label>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '10px' }} onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input key={idx} ref={inputRefs[idx]} type="text" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(e.target.value, idx)}
                        onKeyDown={e => handleOtpKey(e, idx)}
                        style={{
                          width: '44px', height: '50px', textAlign: 'center', fontWeight: '800', fontSize: '20px',
                          background: '#f8fafc', border: `1.5px solid ${otpError ? '#ef4444' : '#e2e8f0'}`,
                          borderRadius: '12px', outline: 'none', color: '#1e293b', transition: 'all 0.15s',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'var(--theme-primary,#0F9B8E)'; e.target.style.boxShadow = '0 0 0 3px rgba(15,155,142,0.12)'; }}
                        onBlur={e => { e.target.style.borderColor = otpError ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                      />
                    ))}
                  </div>
                  {otpError && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', fontWeight: '600', justifyContent: 'center', marginBottom: '8px' }}><AlertCircle size={14} /> {otpError}</div>}
                  <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                    Didn't receive code?{' '}
                    {countdown > 0
                      ? <span style={{ color: '#94a3b8', fontWeight: '600' }}>Resend in {countdown}s</span>
                      : <button type="button" onClick={handleResend} disabled={sending} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-primary,#0F9B8E)', fontWeight: '700', fontSize: '13px' }}>Resend OTP</button>
                    }
                  </div>
                  <button type="submit" disabled={verifying} style={{
                    width: '100%', padding: '16px', background: 'linear-gradient(135deg, var(--theme-primary,#0F9B8E), #12B3A7)',
                    color: '#fff', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '14px',
                    cursor: verifying ? 'not-allowed' : 'pointer', opacity: verifying ? 0.8 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    {verifying ? <span style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : <><ShieldCheck size={18} /> Verify OTP</>}
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 3: New Password ── */}
            {step === STEPS.PASSWORD && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Set New Password</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>Create a strong new password for your account.</p>
                <form onSubmit={handleReset}>
                  {[
                    { label: 'New Password', value: password, onChange: e => { setPassword(e.target.value); setPwdError(''); }, show: showPwd, toggle: () => setShowPwd(v => !v) },
                    { label: 'Confirm Password', value: confirm, onChange: e => { setConfirm(e.target.value); setPwdError(''); }, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
                  ].map(({ label, value, onChange, show, toggle }) => (
                    <div key={label} style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder="••••••••"
                          style={{ width: '100%', paddingLeft: '44px', paddingRight: '44px', paddingTop: '14px', paddingBottom: '14px', background: '#f8fafc', border: `1.5px solid ${pwdError ? '#ef4444' : '#e2e8f0'}`, borderRadius: '14px', fontSize: '14px', color: '#1e293b', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                          onFocus={e => { e.target.style.borderColor = 'var(--theme-primary,#0F9B8E)'; e.target.style.boxShadow = '0 0 0 4px rgba(15,155,142,0.1)'; }}
                          onBlur={e => { e.target.style.borderColor = pwdError ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        />
                        <button type="button" onClick={toggle} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                          {show ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {pwdError && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}><AlertCircle size={14} /> {pwdError}</div>}
                  <button type="submit" disabled={resetting} style={{
                    width: '100%', padding: '16px', background: 'linear-gradient(135deg, var(--theme-primary,#0F9B8E), #12B3A7)',
                    color: '#fff', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '14px',
                    cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.8 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    {resetting ? <span style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : 'Reset Password'}
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 4: Success ── */}
            {step === STEPS.SUCCESS && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: '72px', height: '72px', background: 'rgba(15,155,142,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--theme-primary,#0F9B8E)' }}>
                  <CheckCircle2 size={38} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>Password Reset!</h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px', lineHeight: 1.6 }}>
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
                <button onClick={() => window.history.back()} style={{
                  width: '100%', padding: '16px', background: 'linear-gradient(135deg, var(--theme-primary,#0F9B8E), #12B3A7)',
                  color: '#fff', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '14px', cursor: 'pointer',
                }}>
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
