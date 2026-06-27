import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
const STEPS = { EMAIL: 1, OTP: 2, PASSWORD: 3, SUCCESS: 4 };

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.EMAIL);

  const [email, setEmail] = useState('');
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
        body: JSON.stringify({ email }),
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
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-[#0F172A] to-teal-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-teal-400" />
        <div className="p-8">

          {/* Step progress */}
          {step < STEPS.SUCCESS && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step > i + 1 ? 'bg-primary text-white' : step === i + 1 ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-slate-100 text-slate-400'}`}>
                      {step > i + 1 ? '✓' : i + 1}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${step === i + 1 ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`w-8 h-0.5 rounded-full mb-4 transition-all duration-500 ${step > i + 1 ? 'bg-primary' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Back button */}
          {step < STEPS.SUCCESS && (
            <button onClick={() => { if (step === STEPS.EMAIL) navigate('/login'); else setStep(s => s - 1); }}
              className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-semibold text-sm mb-5 focus:outline-none">
              <ArrowLeft className="w-4 h-4" />
              {step === STEPS.EMAIL ? 'Back to Login' : step === STEPS.OTP ? 'Change Email' : 'Re-verify OTP'}
            </button>
          )}

          {/* STEP 1 */}
          {step === STEPS.EMAIL && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Forgot Password?</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Enter your registered email and we'll send a 6-digit OTP to verify your identity.</p>
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 w-4 h-4 text-slate-400" />
                    <input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} placeholder="nurse@hospital.com"
                      className={`w-full pl-11 pr-4 py-3 bg-slate-50 border ${emailError ? 'border-red-400' : 'border-slate-200 focus:border-primary/50 focus:ring-primary/10'} rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`} />
                  </div>
                  {emailError && <span className="text-red-500 text-[11px] font-medium mt-1.5 pl-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {emailError}</span>}
                </div>
                <button type="submit" disabled={sending}
                  className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2">
                  {sending ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</> : 'Send OTP'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2 */}
          {step === STEPS.OTP && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Verify OTP</h2>
              <p className="text-sm text-slate-500 mb-1">We sent a 6-digit code to</p>
              <p className="text-sm font-bold text-primary mb-6">{email}</p>
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">6-Digit OTP</label>
                  <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input key={idx} ref={inputRefs[idx]} type="text" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(e.target.value, idx)} onKeyDown={e => handleOtpKey(e, idx)}
                        className={`w-11 h-12 text-center font-bold text-xl bg-slate-50 border ${otpError ? 'border-red-400' : 'border-slate-200 focus:border-primary/50 focus:ring-primary/10'} rounded-lg text-slate-800 focus:outline-none focus:ring-4 transition-all duration-150`} />
                    ))}
                  </div>
                  {otpError && <span className="text-red-500 text-[11px] font-medium mt-2 flex items-center gap-1 justify-center"><AlertCircle className="w-3 h-3" /> {otpError}</span>}
                  <div className="text-center text-xs text-slate-500 mt-3">
                    Didn't receive code?{' '}
                    {countdown > 0
                      ? <span className="font-bold text-slate-400">Resend in {countdown}s</span>
                      : <button type="button" onClick={handleResend} disabled={sending} className="font-bold text-primary hover:underline focus:outline-none">{sending ? 'Sending…' : 'Resend OTP'}</button>}
                  </div>
                </div>
                <button type="submit" disabled={verifying}
                  className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2">
                  {verifying ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying…</> : <><ShieldCheck className="w-4 h-4" /> Verify OTP</>}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3 */}
          {step === STEPS.PASSWORD && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Set New Password</h2>
              <p className="text-sm text-slate-500 mb-6">Create a strong new password for your account.</p>
              <form onSubmit={handleReset} className="space-y-4">
                {[
                  { label: 'New Password', value: password, set: v => { setPassword(v); setPwdError(''); }, show: showPwd, toggle: () => setShowPwd(v => !v) },
                  { label: 'Confirm Password', value: confirm, set: v => { setConfirm(v); setPwdError(''); }, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
                ].map(({ label, value, set, show, toggle }) => (
                  <div key={label} className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">{label}</label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 w-4 h-4 text-slate-400" />
                      <input type={show ? 'text' : 'password'} value={value} onChange={e => set(e.target.value)} placeholder="••••••••"
                        className={`w-full pl-11 pr-11 py-3 bg-slate-50 border ${pwdError ? 'border-red-400' : 'border-slate-200 focus:border-primary/50 focus:ring-primary/10'} rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`} />
                      <button type="button" onClick={toggle} className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none">
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                {pwdError && <span className="text-red-500 text-[11px] font-medium flex items-center gap-1 pl-1"><AlertCircle className="w-3 h-3" /> {pwdError}</span>}
                <button type="submit" disabled={resetting}
                  className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 mt-2">
                  {resetting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting…</> : 'Reset Password'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4 */}
          {step === STEPS.SUCCESS && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Password Reset!</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">Your password has been reset successfully. You can now sign in with your new password.</p>
              <button onClick={() => navigate('/login')}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-primary/20">
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
