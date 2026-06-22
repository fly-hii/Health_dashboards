import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from '../../utils/toast';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const STEPS = { EMAIL: 1, OTP: 2, PASSWORD: 3, SUCCESS: 4 };

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
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
  const inputRefs = Array.from({ length: 6 }, () => useRef(null));

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

  /* ── Step 1: Send OTP ───────────────────────────────────────── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setEmailError('');
    if (!email) return setEmailError('Email is required');
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email))
      return setEmailError('Invalid email address');
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return setEmailError(data.message || 'Failed to send OTP');
      toast.success(data.message || 'OTP sent to your email!');
      setStep(STEPS.OTP);
      setCountdown(30);
    } catch { setEmailError('Network error. Please check your connection.'); }
    finally { setSending(false); }
  };

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { toast.success('OTP resent!'); setCountdown(30); setOtp(['', '', '', '', '', '']); }
      else toast.error(data.message || 'Failed to resend OTP');
    } catch { toast.error('Network error.'); }
    finally { setSending(false); }
  };

  /* ── Step 2: Verify OTP ─────────────────────────────────────── */
  const handleOtpChange = (val, idx) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const n = [...otp]; n[idx] = ''; setOtp(n); return;
    }
    const n = [...otp]; n[idx] = clean.slice(-1); setOtp(n);
    if (idx < 5 && clean) inputRefs[idx + 1].current?.focus();
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
      if (!res.ok) return setOtpError(data.message || 'Invalid OTP. Try again.');
      toast.success('OTP verified!');
      setStep(STEPS.PASSWORD);
    } catch { setOtpError('Network error. Please try again.'); }
    finally { setVerifying(false); }
  };

  /* ── Step 3: Reset Password ────────────────────────────────── */
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
      if (!res.ok) return setPwdError(data.message || 'Failed to reset password. Try again.');
      setStep(STEPS.SUCCESS);
    } catch { setPwdError('Network error. Please try again.'); }
    finally { setResetting(false); }
  };

  /* ── Shared UI ───────────────────────────────────────────────── */
  const backLabel = step === STEPS.EMAIL ? 'Back to Login' : step === STEPS.OTP ? 'Change Email' : step === STEPS.PASSWORD ? 'Re-verify OTP' : null;
  const handleBack = () => {
    if (step === STEPS.EMAIL) navigate('/login');
    else if (step === STEPS.OTP) setStep(STEPS.EMAIL);
    else if (step === STEPS.PASSWORD) setStep(STEPS.OTP);
  };

  const stepLabel = ['Enter Email', 'Verify OTP', 'New Password'];

  return (
    <div className="min-h-screen w-full bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#0F9B8E]/20 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300">
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7]" />

        <div className="p-8 pt-10">
          {/* Step progress dots */}
          {step < STEPS.SUCCESS && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {stepLabel.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step > i + 1 ? 'bg-[#0F9B8E] text-white' :
                      step === i + 1 ? 'bg-[#0F9B8E] text-white ring-4 ring-[#0F9B8E]/20' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${step === i + 1 ? 'text-[#0F9B8E]' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 rounded-full mb-4 transition-all duration-500 ${step > i + 1 ? 'bg-[#0F9B8E]' : 'bg-slate-200'}`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Back button */}
          {step < STEPS.SUCCESS && (
            <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-[#0F9B8E] transition-colors font-semibold text-sm mb-5 focus:outline-none">
              <ArrowLeft className="w-4 h-4" /> {backLabel}
            </button>
          )}

          {/* ── STEP 1: Email ── */}
          {step === STEPS.EMAIL && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Forgot Password?</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Enter your registered email and we'll send you a 6-digit OTP to reset your password.</p>
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                      placeholder="Enter your email address"
                      className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border ${emailError ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'} rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                    />
                  </div>
                  {emailError && <span className="text-red-500 text-xs font-semibold mt-2 pl-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {emailError}</span>}
                </div>
                <button type="submit" disabled={sending}
                  className="w-full py-4 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7] hover:shadow-lg hover:shadow-[#0F9B8E]/25 text-white font-bold text-sm rounded-2xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2">
                  {sending ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send OTP'}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === STEPS.OTP && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Verify OTP</h2>
              <p className="text-sm text-slate-500 mb-1 leading-relaxed">We sent a 6-digit code to</p>
              <p className="text-sm font-bold text-[#0F9B8E] mb-6">{email}</p>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1">Enter 6-digit OTP</label>
                  <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input key={idx} ref={inputRefs[idx]} type="text" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(e.target.value, idx)}
                        onKeyDown={e => handleOtpKey(e, idx)}
                        className={`w-11 h-12 text-center font-bold text-xl bg-slate-50 border ${otpError ? 'border-red-400' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'} rounded-xl text-slate-800 focus:outline-none focus:ring-4 transition-all duration-150`}
                      />
                    ))}
                  </div>
                  {otpError && <span className="text-red-500 text-xs font-semibold mt-2 pl-1 flex items-center gap-1.5 justify-center"><AlertCircle className="w-4 h-4" /> {otpError}</span>}
                  <div className="flex items-center justify-center mt-3 gap-1.5">
                    <span className="text-xs text-slate-500">Didn't receive code?</span>
                    {countdown > 0
                      ? <span className="text-xs font-bold text-slate-400">Resend in {countdown}s</span>
                      : <button type="button" onClick={handleResend} disabled={sending} className="text-xs font-bold text-[#0F9B8E] hover:underline focus:outline-none">{sending ? 'Sending…' : 'Resend OTP'}</button>
                    }
                  </div>
                </div>
                <button type="submit" disabled={verifying}
                  className="w-full py-4 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7] hover:shadow-lg hover:shadow-[#0F9B8E]/25 text-white font-bold text-sm rounded-2xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2">
                  {verifying ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Verify OTP</>}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === STEPS.PASSWORD && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Set New Password</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Create a strong new password for your account.</p>
              <form onSubmit={handleReset} className="space-y-5">
                {[
                  { label: 'New Password', value: password, onChange: setPassword, show: showPwd, toggle: () => setShowPwd(v => !v) },
                  { label: 'Confirm Password', value: confirm, onChange: setConfirm, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
                ].map(({ label, value, onChange, show, toggle }) => (
                  <div key={label} className="flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">{label}</label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 w-5 h-5 text-slate-400" />
                      <input type={show ? 'text' : 'password'} value={value} onChange={e => { onChange(e.target.value); setPwdError(''); }}
                        placeholder="••••••••"
                        className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 border ${pwdError ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'} rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                      />
                      <button type="button" onClick={toggle} className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none">
                        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))}
                {pwdError && <span className="text-red-500 text-xs font-semibold flex items-center gap-1.5 pl-1"><AlertCircle className="w-4 h-4" /> {pwdError}</span>}
                <button type="submit" disabled={resetting}
                  className="w-full py-4 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7] hover:shadow-lg hover:shadow-[#0F9B8E]/25 text-white font-bold text-sm rounded-2xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2">
                  {resetting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 4: Success ── */}
          {step === STEPS.SUCCESS && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-[#e6f5f3] rounded-full flex items-center justify-center text-[#0F9B8E] mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Password Reset!</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">Your password has been reset successfully. You can now log in with your new password.</p>
              <button onClick={() => navigate('/login')}
                className="w-full py-4 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7] hover:shadow-lg text-white font-bold text-sm rounded-2xl transition-all duration-200 transform hover:scale-[1.02]">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
