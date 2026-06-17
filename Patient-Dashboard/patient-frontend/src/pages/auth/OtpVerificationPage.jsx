import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from '../../utils/toast';
import axios from 'axios';

export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  const mobileNumber = location.state?.mobileNumber || 'your mobile number';

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleChange = (value, index) => {
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

  const handleKeyDown = (e, index) => {
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

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').substring(0, 6);
    if (pasteData.length === 6) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      inputRefs[5].current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const combinedOtp = otp.join('');
    if (combinedOtp.length !== 6) {
      toast.warning('Please enter all 6 verification code digits.');
      return;
    }

    setLoading(true);
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mobileNumber);
      const payload = isEmail 
        ? { email: mobileNumber, otp: combinedOtp }
        : { mobileNumber: mobileNumber, otp: combinedOtp };

      const res = await axios.post('/api/auth/verify-otp', payload);
      if (res.data.success) {
        toast.success('Verification successful!');
        toast.info('Session initialized. Redirecting...');
        localStorage.setItem('patient_token', res.data.token);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (resendTimer === 0) {
      setResendTimer(30);
      toast.success('A new verification code has been sent to ' + mobileNumber);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#0F9B8E]/20 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Header decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7]"></div>

        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-slate-500 hover:text-[#0F9B8E] transition-colors font-semibold text-sm mb-6 focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#e6f5f3] rounded-2xl flex items-center justify-center text-[#0F9B8E] mx-auto mb-4 shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">OTP Verification</h2>
          <p className="text-sm text-slate-400 mt-2">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-sm font-bold text-slate-700 mt-1">{mobileNumber}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pl-1 text-center">
              Verification Code
            </label>
            
            {/* 6 Digit OTP boxes */}
            <div className="flex gap-2.5 justify-center items-center" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className="w-12 h-12 text-center font-bold text-xl bg-slate-50 border border-slate-200 focus:border-[#0F9B8E] focus:ring-4 focus:ring-[#0F9B8E]/10 rounded-xl outline-none transition-all duration-150 text-slate-800"
                />
              ))}
            </div>
          </div>

          <div className="text-center text-sm text-slate-500 mt-2">
            Didn't receive the code?{' '}
            {resendTimer > 0 ? (
              <span className="text-[#0F9B8E] font-bold">Resend in {resendTimer}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-[#0F9B8E] font-bold hover:underline focus:outline-none"
              >
                Resend Code
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7] hover:shadow-lg hover:shadow-[#0F9B8E]/20 text-white font-bold text-sm rounded-2xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Verify & Proceed</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
