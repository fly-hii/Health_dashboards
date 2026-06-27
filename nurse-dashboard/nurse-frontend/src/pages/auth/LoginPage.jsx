import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff, ShieldAlert, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
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
    if (!form.email) {
      setErrors({ email: 'Email is required to request OTP' });
      return;
    }
    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_URL}/auth/login-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ email: data.message || 'Failed to send OTP' }); return; }
      setCountdown(30);
      setOtpSent(true);
      toast.success(data.message || 'OTP sent to your registered email!');
    } catch (_) {
      setErrors({ email: 'Network error. Could not send OTP.' });
    }
  };


  const validate = () => {
    const errs = {};
    if (!form.email)    errs.email    = 'Email is required';
    if (!isOtpMode) {
      if (!form.password) errs.password = 'Password is required';
    } else {
      const combinedOtp = otp.join('');
      if (!otpSent) {
        errs.otp = 'Please request and enter OTP';
      } else if (combinedOtp.length !== 6) {
        errs.otp = 'OTP must be a 6-digit number';
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      if (isOtpMode) {
        await login(form.email, undefined, otp.join(''));
      } else {
        await login(form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-[#0F172A] to-teal-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-2xl relative z-10 transition-all duration-300 hover:shadow-primary/5">
        
        {/* Header/Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">CareSync</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Nurse Portal — Sign In</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="flex flex-col text-left">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Email Address</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="nurse@hospital.com"
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 border ${
                  errors.email ? 'border-danger focus:ring-danger/10' : 'border-slate-200 focus:border-primary/50 focus:ring-primary/10'
                } rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
              />
            </div>
            {errors.email && (
              <span className="text-danger text-[11px] font-medium mt-1 pl-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errors.email}
              </span>
            )}
          </div>

          {/* Password / OTP field */}
          {!isOtpMode ? (
            <div className="flex flex-col text-left">
              <div className="flex justify-between items-center mb-1.5 pl-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-11 py-3 bg-slate-50 border ${
                    errors.password ? 'border-danger focus:ring-danger/10' : 'border-slate-200 focus:border-primary/50 focus:ring-primary/10'
                  } rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-danger text-[11px] font-medium mt-1 pl-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> {errors.password}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col text-left space-y-2">
              <div className="flex justify-between items-center pl-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Code</label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={countdown > 0}
                  className={`text-[11px] font-bold transition-all focus:outline-none ${
                    countdown > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-primary hover:underline'
                  }`}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>

              {otpSent ? (
                <div className="flex gap-2.5 justify-center items-center py-2" onPaste={handlePasteOtp}>
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
                      className={`w-11 h-11 text-center font-bold text-lg bg-slate-50 border rounded-lg outline-none transition-all duration-150 text-slate-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 ${
                        errors.otp ? 'border-danger' : 'border-slate-200'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  Please request OTP code to verify your account
                </p>
              )}

              {errors.otp && (
                <span className="text-danger text-[11px] font-medium mt-1 pl-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> {errors.otp}
                </span>
              )}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>{isOtpMode ? 'Verify & Sign In' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsOtpMode(!isOtpMode);
              setOtpSent(false);
              setOtp(['', '', '', '', '', '']);
              setErrors({});
            }}
            className="w-full py-2.5 border border-primary/30 hover:bg-primary/5 text-primary font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 focus:outline-none"
          >
            {isOtpMode ? 'Sign In with Password' : 'Sign In with OTP'}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-center mt-6 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          © {new Date().getFullYear()} CareSync HMS. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
