import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, Eye, EyeOff, Shield, FileText, Pill, Search, HelpCircle, LogIn } from 'lucide-react';
import api from '../services/api';
import { socket } from '../sockets/socket';
import { toast } from 'react-toastify';

export default function PharmacyLogin() {
  const navigate = useNavigate();

  // Form states
  const [storeId, setStoreId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Validation / Error states
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle field changes and clear respective errors
  const handleInputChange = (field, value, setter) => {
    setter(value);
    setApiError('');
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Perform form validation
  const validateForm = () => {
    const newErrors = {};
    if (!storeId.trim()) {
      newErrors.storeId = 'Store ID is required';
    }

    if (isOtpMode) {
      if (!otpSent) {
        newErrors.otp = 'Please request and enter OTP';
      } else if (!otp.trim()) {
        newErrors.otp = 'OTP is required';
      } else if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        newErrors.otp = 'OTP must be a 6-digit number';
      }
    } else {
      if (!password.trim()) {
        newErrors.password = 'Password is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle request for OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!storeId.trim()) {
      setErrors({ storeId: 'Store ID is required to send OTP' });
      return;
    }

    setOtpLoading(true);
    setApiError('');
    try {
      const res = await api.post('/api/pharmacy/auth/send-otp', { storeId });
      if (res.data.success) {
        setOtpSent(true);
        setCountdown(30);
        toast.info(res.data.message, { autoClose: 10000 }); // Show longer toast for testing OTP visibility
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to send OTP. Please check your Store ID.';
      setApiError(errMsg);
      toast.error(errMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle standard or OTP login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiError('');
    try {
      const payload = isOtpMode ? { storeId, otp } : { storeId, password };
      const res = await api.post('/api/pharmacy/auth/login', payload);

      if (res.data.success) {
        // 1. Store JWT token
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));

        // 2. Create Socket.io connection
        socket.connect();

        toast.success('Welcome back, Pharmacist!');
        
        // 3. Redirect to dashboard
        navigate('/pharmacy/dashboard');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      setApiError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Toggle between password and OTP mode
  const toggleAuthMode = () => {
    setIsOtpMode(!isOtpMode);
    setApiError('');
    setErrors({});
    // Reset password & OTP values when switching
    setPassword('');
    setOtp('');
    setOtpSent(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#F3F8F2] flex items-center justify-center p-6 lg:p-8 font-sans">
      {/* Centered Main Layout Card */}
      <div className="w-full max-w-[1200px] h-auto lg:h-[675px] bg-[#F5FAF5] rounded-[20px] border border-[#E6ECE6] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[52%_48%] relative">
        
        {/* LEFT PANEL - Hidden on mobile, visible and stacked on tablet, side-by-side on desktop */}
        <div className="hidden md:flex relative w-full h-[400px] lg:h-full flex-col justify-between p-8 lg:p-10 select-none">
          {/* Pharmacy Background Image */}
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url('/src/assets/pharmacy_interior.png')` }}
          />
          {/* Background Overlay & Blur */}
          <div 
            className="absolute inset-0 z-10 bg-[rgba(240,248,240,0.82)]"
            style={{ backdropFilter: 'blur(2px)' }}
          />

          {/* Logo Section */}
          <div className="relative z-20 flex items-center gap-2.5">
            {/* Medical Icon */}
            <div className="w-[48px] h-[48px] flex items-center justify-center bg-[#2E7D32] rounded-[10px] shadow-sm text-white">
              {/* Custom Medical Cross Icon with heart outline and heartbeat */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.5 2H15.5C16.3284 2 17 2.67157 17 3.5V7H20.5C21.3284 7 22 7.67157 22 8.5V15.5C22 16.3284 21.3284 17 20.5 17H17V20.5C17 21.3284 16.3284 22 15.5 22H8.5C7.67157 22 7 21.3284 7 20.5V17H3.5C2.67157 17 2 16.3284 2 15.5V8.5C2 7.67157 2.67157 7 3.5 7H7V3.5C7 2.67157 7.67157 2 8.5 2Z" fill="#2E7D32" />
                {/* Heart Outline + Heartbeat wave inside */}
                <path d="M12 16.5C12 16.5 8.5 13.5 8.5 11C8.5 9.5 9.5 8.5 11 8.5C11.5 8.5 12 9 12 9C12 9 12.5 8.5 13 8.5C14.5 8.5 15.5 9.5 15.5 11C15.5 13.5 12 16.5 12 16.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M10.2 11H11.4L11.9 10L12.4 12L12.9 11H13.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-bold text-[#234F3F] leading-tight">CarePlus</span>
              <span className="text-[9px] font-bold text-[#234F3F] tracking-[0.25em] uppercase leading-none mt-0.5">HOSPITAL</span>
            </div>
          </div>

          {/* Title Section */}
          <div className="relative z-20 mt-4 lg:mt-[50px] flex-1 flex flex-col justify-center lg:justify-start">
            <h1 className="text-[32px] lg:text-[40px] font-bold text-[#2E7D32] leading-[1.1] tracking-tight">Pharmacy Login</h1>
            <p className="text-[16px] lg:text-[19px] font-normal text-[#4B5563] mt-2 lg:mt-3 max-w-[280px] leading-snug">
              Welcome back! Please login to your account.
            </p>

            {/* Feature Cards Stack */}
            <div className="mt-6 lg:mt-8 flex flex-col gap-4">
              {/* Card 1 */}
              <div className="w-[300px] h-[80px] bg-white rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] p-3 flex items-center gap-3.5 transition-transform hover:translate-x-1 duration-200">
                <div className="w-[48px] h-[48px] bg-[#F4FAF5] rounded-[10px] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#2E7D32]" />
                </div>
                <div className="flex flex-col justify-center text-left">
                  <h3 className="text-[16px] font-semibold text-[#234F3F] leading-tight">Prescription Orders</h3>
                  <p className="text-[13px] text-[#4B5563] mt-0.5 leading-tight">View and manage prescription orders</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="w-[300px] h-[80px] bg-white rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] p-3 flex items-center gap-3.5 transition-transform hover:translate-x-1 duration-200">
                <div className="w-[48px] h-[48px] bg-[#F4FAF5] rounded-[10px] flex items-center justify-center shrink-0">
                  <Pill className="w-5 h-5 text-[#2E7D32]" />
                </div>
                <div className="flex flex-col justify-center text-left">
                  <h3 className="text-[16px] font-semibold text-[#234F3F] leading-tight">Inventory Management</h3>
                  <p className="text-[13px] text-[#4B5563] mt-0.5 leading-tight">Manage medicines and stock</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="w-[300px] h-[80px] bg-white rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] p-3 flex items-center gap-3.5 transition-transform hover:translate-x-1 duration-200">
                <div className="w-[48px] h-[48px] bg-[#F4FAF5] rounded-[10px] flex items-center justify-center shrink-0">
                  <Search className="w-5 h-5 text-[#2E7D32]" />
                </div>
                <div className="flex flex-col justify-center text-left">
                  <h3 className="text-[16px] font-semibold text-[#234F3F] leading-tight">Order Tracking</h3>
                  <p className="text-[13px] text-[#4B5563] mt-0.5 leading-tight">Track and update order status</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer - hidden on tablet, visible on desktop */}
          <div className="relative z-20 text-[11px] text-[#6B7280] hidden lg:block">
            © {new Date().getFullYear()} CarePlus Healthcare System. All rights reserved.
          </div>
        </div>

        {/* RIGHT PANEL - Centered login card container */}
        <div className="w-full h-full flex items-center justify-center p-4 lg:p-8">
          {/* White Login Card */}
          <div className="w-full max-w-[420px] bg-white rounded-[20px] border border-[#E6ECE6] shadow-lg p-6 lg:p-8 flex flex-col justify-between">
            <div>
              {/* Circular Badge Icon */}
              <div className="w-[64px] h-[64px] bg-[#2E7D32] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Store className="w-[32px] h-[32px] text-white" />
              </div>

              {/* Heading */}
              <h2 className="text-[24px] lg:text-[28px] font-bold text-[#111827] text-center mt-4 mb-6 tracking-tight">
                Login to your account
              </h2>

              {/* Global API Error */}
              {apiError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium rounded-[8px] text-center">
                  {apiError}
                </div>
              )}

              {/* Form fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Store ID input */}
                <div className="flex flex-col text-left">
                  <label className="text-[13px] font-semibold text-[#374151] mb-1.5" htmlFor="store-id">
                    Store ID
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Store className="h-4.5 w-4.5 text-gray-400" />
                    </span>
                    <input
                      id="store-id"
                      type="text"
                      className={`block w-full pl-11 pr-4 py-2.5 border rounded-[8px] leading-5 bg-white text-[15px] text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all duration-200 ${
                        errors.storeId ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-[#DDE7DF]'
                      }`}
                      placeholder="Enter your store ID"
                      value={storeId}
                      onChange={(e) => handleInputChange('storeId', e.target.value, setStoreId)}
                      disabled={loading || otpLoading}
                    />
                  </div>
                  {errors.storeId && (
                    <span className="text-red-500 text-[12px] font-medium mt-1 pl-1">
                      {errors.storeId}
                    </span>
                  )}
                </div>

                {/* Password field (Standard mode) */}
                {!isOtpMode && (
                  <div className="flex flex-col text-left">
                    <label className="text-[13px] font-semibold text-[#374151] mb-1.5" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4.5 w-4.5 text-gray-400" />
                      </span>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`block w-full pl-11 pr-11 py-2.5 border rounded-[8px] leading-5 bg-white text-[15px] text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all duration-200 ${
                          errors.password ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-[#DDE7DF]'
                        }`}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => handleInputChange('password', e.target.value, setPassword)}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="text-red-500 text-[12px] font-medium mt-1 pl-1">
                        {errors.password}
                      </span>
                    )}
                    {/* Forgot Password link positioned below input, right-aligned */}
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        className="text-[13px] font-semibold text-[#2E7D32] hover:text-[#256C2A] hover:underline cursor-pointer focus:outline-none"
                        onClick={() => toast.info('Please contact your IT administrator to reset your password.')}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                )}

                {/* OTP field (OTP mode) */}
                {isOtpMode && (
                  <div className="flex flex-col text-left">
                    <label className="text-[13px] font-semibold text-[#374151] mb-1.5" htmlFor="otp">
                      OTP Code
                    </label>
                    <div className="flex gap-2.5">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Shield className="h-4.5 w-4.5 text-gray-400" />
                        </span>
                        <input
                          id="otp"
                          type="text"
                          maxLength={6}
                          className={`block w-full pl-11 pr-4 py-2.5 border rounded-[8px] leading-5 bg-white text-[15px] text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all duration-200 ${
                            errors.otp ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-[#DDE7DF]'
                          }`}
                          placeholder="6-digit OTP code"
                          value={otp}
                          onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, ''), setOtp)}
                          disabled={loading || !otpSent}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpLoading || countdown > 0}
                        className={`px-4 h-[44px] rounded-[8px] text-[13px] font-bold border transition-all cursor-pointer ${
                          countdown > 0
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-[#F4FAF5] border-[#2E7D32]/25 text-[#2E7D32] hover:bg-emerald-100/60'
                        }`}
                      >
                        {otpLoading 
                          ? 'Sending...' 
                          : countdown > 0 
                            ? `Resend (${countdown}s)` 
                            : otpSent 
                              ? 'Resend OTP' 
                              : 'Send OTP'}
                      </button>
                    </div>
                    {errors.otp && (
                      <span className="text-red-500 text-[12px] font-medium mt-1 pl-1">
                        {errors.otp}
                      </span>
                    )}
                  </div>
                )}

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[46px] bg-[#2E7D32] hover:bg-[#256C2A] text-white font-bold text-[15px] rounded-[8px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#2E7D32]/10 disabled:opacity-75 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4.5 h-4.5" />
                      {isOtpMode ? 'Verify & Login' : 'Login'}
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E6ECE6]"></div>
                </div>
                <span className="relative px-3 bg-white text-xs font-semibold text-gray-400 uppercase select-none">
                  or
                </span>
              </div>

              {/* Login mode toggle button */}
              <button
                type="button"
                onClick={toggleAuthMode}
                className="w-full h-[46px] border border-[#2E7D32] hover:bg-emerald-50/20 text-[#2E7D32] font-bold text-[15px] rounded-[8px] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
              >
                {isOtpMode ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Login with Password
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Login with OTP
                  </>
                )}
              </button>
            </div>

            {/* IT Support footer */}
            <div className="mt-6 text-center text-xs text-gray-500 font-semibold flex items-center justify-center gap-1">
              <span>Need help?</span>
              <button
                type="button"
                className="text-[#2E7D32] hover:text-[#256C2A] font-bold hover:underline cursor-pointer focus:outline-none flex items-center gap-0.5"
                onClick={() => toast.info('Support: it-support@careplus.com | +91 1800-419-876')}
              >
                <HelpCircle className="w-3 h-3" />
                Contact IT Support
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
