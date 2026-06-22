import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck, FileText, Pill, Search } from 'lucide-react';

const BASE_API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';
const API = `${BASE_API}/api/pharmacy`;
const STEPS = { EMAIL: 1, OTP: 2, PASSWORD: 3, SUCCESS: 4 };

export default function PharmacyForgotPassword() {
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen w-full bg-[#F3F8F2] flex items-center justify-center p-6 lg:p-8 font-sans">
      <div className="w-full max-w-[1200px] h-auto lg:h-[700px] bg-[#F5FAF5] rounded-[20px] border border-[#E6ECE6] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[52%_48%] relative">

        {/* LEFT PANEL */}
        <div className="hidden md:flex relative w-full h-[400px] lg:h-full flex-col justify-between p-8 lg:p-10 select-none">
          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('/src/assets/pharmacy_interior.png')` }} />
          <div className="absolute inset-0 z-10 bg-[rgba(240,248,240,0.82)]" style={{ backdropFilter: 'blur(2px)' }} />

          <div className="relative z-20 flex items-center gap-2.5">
            <div className="w-[48px] h-[48px] flex items-center justify-center bg-[#2E7D32] rounded-[10px] shadow-sm text-white">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M8.5 2H15.5C16.3284 2 17 2.67157 17 3.5V7H20.5C21.3284 7 22 7.67157 22 8.5V15.5C22 16.3284 21.3284 17 20.5 17H17V20.5C17 21.3284 16.3284 22 15.5 22H8.5C7.67157 22 7 21.3284 7 20.5V17H3.5C2.67157 17 2 16.3284 2 15.5V8.5C2 7.67157 2.67157 7 3.5 7H7V3.5C7 2.67157 7.67157 2 8.5 2Z" fill="#2E7D32" />
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[20px] font-bold text-[#234F3F] leading-tight">CarePlus</span>
              <span className="text-[9px] font-bold text-[#234F3F] tracking-[0.25em] uppercase leading-none mt-0.5">HOSPITAL</span>
            </div>
          </div>

          <div className="relative z-20 mt-4 lg:mt-[50px] flex-1 flex flex-col justify-center lg:justify-start">
            <h1 className="text-[32px] lg:text-[40px] font-bold text-[#2E7D32] leading-[1.1] tracking-tight">Reset Password</h1>
            <p className="text-[16px] lg:text-[19px] font-normal text-[#4B5563] mt-2 lg:mt-3 max-w-[280px] leading-snug">Verify your identity with OTP and set a new secure password.</p>
            <div className="mt-6 lg:mt-8 flex flex-col gap-4">
              {[{ Icon: FileText, t: 'Prescription Orders', d: 'View and manage prescription orders' }, { Icon: Pill, t: 'Inventory Management', d: 'Manage medicines and stock' }, { Icon: Search, t: 'Order Tracking', d: 'Track and update order status' }].map(({ Icon, t, d }) => (
                <div key={t} className="w-[300px] h-[80px] bg-white rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] p-3 flex items-center gap-3.5 transition-transform hover:translate-x-1 duration-200">
                  <div className="w-[48px] h-[48px] bg-[#F4FAF5] rounded-[10px] flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-[#2E7D32]" /></div>
                  <div className="flex flex-col justify-center text-left">
                    <h3 className="text-[16px] font-semibold text-[#234F3F] leading-tight">{t}</h3>
                    <p className="text-[13px] text-[#4B5563] mt-0.5 leading-tight">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-20 text-[11px] text-[#6B7280] hidden lg:block">© {new Date().getFullYear()} CarePlus Healthcare System. All rights reserved.</div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full h-full flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-[420px] bg-white rounded-[20px] border border-[#E6ECE6] shadow-lg overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#2E7D32] to-emerald-400" />
            <div className="p-6 lg:p-8">

              {/* Step indicators */}
              {step < STEPS.SUCCESS && (
                <div className="flex items-center justify-center gap-1.5 mb-5">
                  {stepLabels.map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${step > i + 1 ? 'bg-[#2E7D32] text-white' : step === i + 1 ? 'bg-[#2E7D32] text-white ring-4 ring-[#2E7D32]/20' : 'bg-[#F4FAF5] text-[#6B7280]'}`}>
                          {step > i + 1 ? '✓' : i + 1}
                        </div>
                        <span className={`text-[8px] font-bold uppercase tracking-wide whitespace-nowrap ${step === i + 1 ? 'text-[#2E7D32]' : 'text-[#9CA3AF]'}`}>{label}</span>
                      </div>
                      {i < 2 && <div className={`w-6 h-0.5 rounded-full mb-3 transition-all duration-500 ${step > i + 1 ? 'bg-[#2E7D32]' : 'bg-[#DDE7DF]'}`} />}
                    </div>
                  ))}
                </div>
              )}

              {step < STEPS.SUCCESS && (
                <button onClick={() => { if (step === STEPS.EMAIL) navigate('/pharmacy/login'); else setStep(s => s - 1); }}
                  className="flex items-center gap-2 text-[#4B5563] hover:text-[#2E7D32] transition-colors font-semibold text-sm mb-4 focus:outline-none">
                  <ArrowLeft className="w-4 h-4" />
                  {step === STEPS.EMAIL ? 'Back to Login' : step === STEPS.OTP ? 'Change Email' : 'Re-verify OTP'}
                </button>
              )}

              {/* STEP 1 */}
              {step === STEPS.EMAIL && (
                <>
                  <h2 className="text-[22px] font-bold text-[#111827] mb-2 tracking-tight">Forgot Password?</h2>
                  <p className="text-[14px] text-[#4B5563] mb-5 leading-relaxed">Enter your registered email to receive a 6-digit OTP.</p>
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="flex flex-col">
                      <label className="text-[13px] font-semibold text-[#374151] mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} placeholder="pharmacy@careplus.com"
                          className={`block w-full pl-11 pr-4 py-2.5 border rounded-[8px] bg-white text-[15px] text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all ${emailError ? 'border-red-300' : 'border-[#DDE7DF]'}`} />
                      </div>
                      {emailError && <span className="flex items-center gap-1 text-red-500 text-[12px] font-medium mt-1.5"><AlertCircle className="w-3.5 h-3.5" /> {emailError}</span>}
                    </div>
                    <button type="submit" disabled={sending} className="w-full h-[46px] bg-[#2E7D32] hover:bg-[#256C2A] disabled:opacity-70 text-white font-bold text-[15px] rounded-[8px] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#2E7D32]/10">
                      {sending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send OTP'}
                    </button>
                  </form>
                </>
              )}

              {/* STEP 2 */}
              {step === STEPS.OTP && (
                <>
                  <h2 className="text-[22px] font-bold text-[#111827] mb-1 tracking-tight">Verify OTP</h2>
                  <p className="text-[14px] text-[#4B5563] mb-1">We sent a 6-digit code to</p>
                  <p className="text-[14px] font-bold text-[#2E7D32] mb-5">{email}</p>
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#374151] mb-3">6-Digit OTP</label>
                      <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                        {otp.map((digit, idx) => (
                          <input key={idx} ref={inputRefs[idx]} type="text" maxLength={1} value={digit}
                            onChange={e => handleOtpChange(e.target.value, idx)} onKeyDown={e => handleOtpKey(e, idx)}
                            className={`w-11 h-12 text-center font-bold text-xl bg-slate-50 border rounded-[8px] outline-none transition-all duration-150 text-[#111827] focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] ${otpError ? 'border-red-300' : 'border-[#DDE7DF]'}`} />
                        ))}
                      </div>
                      {otpError && <p className="text-red-500 text-[12px] font-medium mt-2 text-center flex items-center justify-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {otpError}</p>}
                      <p className="text-center text-[13px] text-[#4B5563] mt-3">
                        Didn't receive code?{' '}
                        {countdown > 0 ? <span className="font-bold text-[#9CA3AF]">Resend in {countdown}s</span>
                          : <button type="button" onClick={handleResend} className="font-bold text-[#2E7D32] hover:underline focus:outline-none">{sending ? 'Sending…' : 'Resend OTP'}</button>}
                      </p>
                    </div>
                    <button type="submit" disabled={verifying} className="w-full h-[46px] bg-[#2E7D32] hover:bg-[#256C2A] disabled:opacity-70 text-white font-bold text-[15px] rounded-[8px] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#2E7D32]/10">
                      {verifying ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Verify OTP</>}
                    </button>
                  </form>
                </>
              )}

              {/* STEP 3 */}
              {step === STEPS.PASSWORD && (
                <>
                  <h2 className="text-[22px] font-bold text-[#111827] mb-2 tracking-tight">Set New Password</h2>
                  <p className="text-[14px] text-[#4B5563] mb-5">Create a strong new password for your account.</p>
                  <form onSubmit={handleReset} className="space-y-4">
                    {[
                      { label: 'New Password', value: password, set: v => { setPassword(v); setPwdError(''); }, show: showPwd, toggle: () => setShowPwd(v => !v) },
                      { label: 'Confirm Password', value: confirm, set: v => { setConfirm(v); setPwdError(''); }, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
                    ].map(({ label, value, set, show, toggle }) => (
                      <div key={label} className="flex flex-col">
                        <label className="text-[13px] font-semibold text-[#374151] mb-1.5">{label}</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type={show ? 'text' : 'password'} value={value} onChange={e => set(e.target.value)} placeholder="••••••••"
                            className={`block w-full pl-11 pr-11 py-2.5 border rounded-[8px] bg-white text-[15px] text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all ${pwdError ? 'border-red-300' : 'border-[#DDE7DF]'}`} />
                          <button type="button" onClick={toggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {pwdError && <p className="text-red-500 text-[12px] font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {pwdError}</p>}
                    <button type="submit" disabled={resetting} className="w-full h-[46px] bg-[#2E7D32] hover:bg-[#256C2A] disabled:opacity-70 text-white font-bold text-[15px] rounded-[8px] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#2E7D32]/10 mt-2">
                      {resetting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                    </button>
                  </form>
                </>
              )}

              {/* STEP 4 */}
              {step === STEPS.SUCCESS && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-[#F4FAF5] rounded-full flex items-center justify-center text-[#2E7D32] mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[#111827] mb-2">Password Reset!</h3>
                  <p className="text-sm text-[#4B5563] mb-6 leading-relaxed">Your password has been reset successfully. You can now sign in with your new password.</p>
                  <button onClick={() => navigate('/pharmacy/login')} className="w-full h-[46px] bg-[#2E7D32] hover:bg-[#256C2A] text-white font-bold text-sm rounded-[8px] transition-all">
                    Back to Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
