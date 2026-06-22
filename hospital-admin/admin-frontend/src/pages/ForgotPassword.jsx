import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const STEPS = { EMAIL: 1, OTP: 2, PASSWORD: 3, SUCCESS: 4 };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.EMAIL);

  const [email, setEmail] = useState('');
  const [hospitalCode, setHospitalCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

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
        body: JSON.stringify({ email, hospitalCode: hospitalCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) return setEmailError(data.message || 'Failed to send OTP');
      setStep(STEPS.OTP);
      setCountdown(30);
    } catch {
      setEmailError('Network error. Please check your connection.');
    } finally { setSending(false); }
  };

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, hospitalCode: hospitalCode || undefined }),
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
    setOtpError('');
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return setOtpError('Please enter all 6 digits');
    setVerifying(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) return setOtpError(data.message || 'Invalid OTP');
      setStep(STEPS.PASSWORD);
    } catch {
      setOtpError('Network error. Please try again.');
    } finally { setVerifying(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (!password || password.length < 6) return setPwdError('Password must be at least 6 characters');
    if (password !== confirm) return setPwdError('Passwords do not match');
    setResetting(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.join(''), newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) return setPwdError(data.message || 'Failed to reset password');
      setStep(STEPS.SUCCESS);
    } catch {
      setPwdError('Network error. Please try again.');
    } finally { setResetting(false); }
  };

  const stepLabels = ['Enter Email', 'Verify OTP', 'New Password'];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[52%_48%] bg-slateBg">
      {/* Left Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar-bg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-xl font-bold tracking-wide">CAREPLUS</span>
        </div>
        <div className="max-w-md my-auto">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Reset your <span className="text-primary">Admin Password</span></h2>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed">We'll verify your identity with a one-time code sent to your registered email, then let you set a new secure password.</p>
        </div>
        <div className="text-xs text-slate-500">&copy; {new Date().getFullYear()} CarePlus Healthcare Systems. All rights reserved.</div>
      </div>

      {/* Right Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            </div>
            <span className="text-xl font-bold tracking-wide text-sidebar-bg">CAREPLUS</span>
          </div>

          {/* Step progress */}
          {step < STEPS.SUCCESS && (
            <div className="flex items-center gap-2 mb-7">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step > i + 1 ? 'bg-primary text-white' : step === i + 1 ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-slate-100 text-slate-400'}`}>
                      {step > i + 1 ? '✓' : i + 1}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${step === i + 1 ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 rounded-full mb-3.5 transition-all duration-500 ${step > i + 1 ? 'bg-primary' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>
          )}

          {step < STEPS.SUCCESS && (
            <button onClick={() => { if (step === STEPS.EMAIL) navigate('/login'); else setStep(s => s - 1); }}
              className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-semibold text-sm mb-6 focus:outline-none">
              <ArrowLeft className="w-4 h-4" />
              {step === STEPS.EMAIL ? 'Back to Login' : step === STEPS.OTP ? 'Change Email' : 'Re-verify OTP'}
            </button>
          )}

          {/* STEP 1 */}
          {step === STEPS.EMAIL && (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password?</h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">Enter your registered email to receive a 6-digit verification OTP.</p>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                  <div className={`flex items-center gap-3 px-4 py-3 bg-slate-50 border rounded-xl focus-within:ring-2 focus-within:ring-primary/10 transition-all ${emailError ? 'border-red-400' : 'border-slate-200 focus-within:border-primary/50'}`}>
                    <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                    <input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} placeholder="admin@careplus.com"
                      className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none" />
                  </div>
                  {emailError && <span className="flex items-center gap-1 text-red-500 text-xs font-semibold mt-1.5"><AlertCircle className="w-3.5 h-3.5" /> {emailError}</span>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Hospital Code <span className="text-slate-300 font-normal">(optional)</span></label>
                  <input type="text" value={hospitalCode} onChange={e => setHospitalCode(e.target.value.toUpperCase())} placeholder="e.g. HOSP001"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all" />
                </div>
                <button type="submit" disabled={sending} className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-primary/20">
                  {sending ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</> : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* STEP 2 */}
          {step === STEPS.OTP && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verify OTP</h1>
                <p className="text-sm text-slate-500 mt-1">We sent a 6-digit code to <span className="font-bold text-primary">{email}</span></p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Enter 6-Digit OTP</label>
                  <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input key={idx} ref={inputRefs[idx]} type="text" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(e.target.value, idx)} onKeyDown={e => handleOtpKey(e, idx)}
                        className={`w-11 h-12 text-center font-bold text-xl bg-slate-50 border ${otpError ? 'border-red-400' : 'border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10'} rounded-lg text-slate-800 focus:outline-none transition-all duration-150`} />
                    ))}
                  </div>
                  {otpError && <p className="text-red-500 text-xs font-semibold mt-2 text-center flex items-center justify-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {otpError}</p>}
                  <p className="text-center text-xs text-slate-500 mt-3">
                    Didn't receive code?{' '}
                    {countdown > 0 ? <span className="font-bold text-slate-400">Resend in {countdown}s</span>
                      : <button type="button" onClick={handleResend} className="font-bold text-primary hover:underline focus:outline-none">{sending ? 'Sending…' : 'Resend OTP'}</button>}
                  </p>
                </div>
                <button type="submit" disabled={verifying} className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-primary/20">
                  {verifying ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying…</> : <><ShieldCheck className="w-4 h-4" /> Verify OTP</>}
                </button>
              </form>
            </>
          )}

          {/* STEP 3 */}
          {step === STEPS.PASSWORD && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h1>
                <p className="text-sm text-slate-500 mt-1">Create a strong new password for your account.</p>
              </div>
              <form onSubmit={handleReset} className="space-y-4">
                {[
                  { label: 'New Password', icon: KeyRound, value: password, set: v => { setPassword(v); setPwdError(''); }, show: showPwd, toggle: () => setShowPwd(v => !v) },
                  { label: 'Confirm Password', icon: Lock, value: confirm, set: v => { setConfirm(v); setPwdError(''); }, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
                ].map(({ label, icon: Icon, value, set, show, toggle }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
                    <div className={`flex items-center gap-3 px-4 py-3 bg-slate-50 border rounded-xl focus-within:ring-2 focus-within:ring-primary/10 transition-all relative ${pwdError ? 'border-red-400' : 'border-slate-200 focus-within:border-primary/50'}`}>
                      <Icon className="w-5 h-5 text-slate-400 shrink-0" />
                      <input type={show ? 'text' : 'password'} value={value} onChange={e => set(e.target.value)} placeholder="••••••••"
                        className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none pr-8" />
                      <button type="button" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))}
                {pwdError && <p className="text-red-500 text-xs font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {pwdError}</p>}
                <button type="submit" disabled={resetting} className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-primary/20 mt-2">
                  {resetting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting…</> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {/* STEP 4 */}
          {step === STEPS.SUCCESS && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Password Reset!</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">Your password has been reset successfully. You can now sign in with your new password.</p>
              <button onClick={() => navigate('/login')} className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-primary/20">
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
