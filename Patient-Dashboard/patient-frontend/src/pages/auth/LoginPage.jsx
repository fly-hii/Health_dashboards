import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import axios from 'axios';
import { 
  Phone, Lock, Eye, EyeOff, Calendar, FileText, ClipboardList, 
  User, Shield, LogIn, Heart, Mail, MapPin, Sparkles, UserCheck,
  AlertCircle, Building
} from 'lucide-react';

export default function LoginPage({ defaultSignUp = false }) {
  const { login, register: registerPatient } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(defaultSignUp);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needHospitalCode, setNeedHospitalCode] = useState(false);

  // Sync state with prop changes (e.g. /login vs /register URL navigation)
  useEffect(() => {
    setIsSignUp(defaultSignUp);
  }, [defaultSignUp]);

  // React Hook Form setups
  const { 
    register: loginRegister, 
    handleSubmit: handleLoginSubmit, 
    watch: loginWatch,
    formState: { errors: loginErrors } 
  } = useForm({
    defaultValues: { mobileNumber: '', password: '', hospitalCode: '' }
  });

  const { 
    register: signUpRegister, 
    handleSubmit: handleSignUpSubmit, 
    watch: signUpWatch,
    formState: { errors: signUpErrors } 
  } = useForm({
    defaultValues: {
      fullName: '',
      dob: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      gender: 'Male',
      bloodGroup: '',
      address: '',
      agree: false
    }
  });

  const activeMobile = loginWatch('mobileNumber');

  // Submit Sign In handler
  const onLoginSubmit = async (data) => {
    setLoading(true);
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.mobileNumber);
      const payload = isEmail 
        ? { email: data.mobileNumber, password: data.password }
        : { mobileNumber: data.mobileNumber, password: data.password };
      
      if (needHospitalCode && data.hospitalCode) {
        payload.hospitalCode = data.hospitalCode;
      }
      
      await login(payload);
      toast.success('Logged in successfully!');
    } catch (err) {
      if (err.message && (err.message.includes('multiple hospitals') || err.message.includes('hospital code'))) {
        setNeedHospitalCode(true);
        toast.info('This account is registered with multiple hospitals. Please provide your hospital code to sign in.');
      } else {
        toast.error(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Sign Up handler
  const onSignUpSubmit = async (data) => {
    if (!data.agree) {
      toast.warning('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await registerPatient({
        full_name: data.fullName,
        email: data.email,
        password: data.password,
        dob: data.dob,
        gender: data.gender,
        phone: data.mobile,
        address: data.address,
        blood_group: data.bloodGroup
      });
      toast.success('Account created successfully! Welcome to CarePlus.');
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Login Trigger handler (using Axios)
  const handleOtpLogin = async () => {
    const value = activeMobile;
    if (!value) {
      toast.warning('Please enter a valid email address or 10-digit mobile number in the field above to receive OTP.');
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isPhone = /^[6-9]\d{9}$/.test(value);

    if (!isEmail && !isPhone) {
      toast.warning('Please enter a valid email address or 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const payload = isEmail ? { email: value } : { mobileNumber: value };
      const codeVal = loginWatch('hospitalCode');
      if (needHospitalCode && codeVal) {
        payload.hospitalCode = codeVal;
      }
      
      const res = await axios.post('/api/auth/send-otp', payload);
      if (res.data.success) {
        toast.success(res.data.message || 'OTP sent successfully!');
        navigate('/otp-verification', { state: { mobileNumber: value, hospitalCode: payload.hospitalCode } });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || '';
      if (errMsg.includes('multiple hospitals') || errMsg.includes('hospital code')) {
        setNeedHospitalCode(true);
        toast.info('This account is registered with multiple hospitals. Please provide your hospital code to send OTP.');
      } else {
        toast.error(errMsg || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#EBF3F5] flex items-center justify-center p-4 md:p-8 font-sans">
      {/* 1200px Centered Login Card Container */}
      <div className="w-full max-w-[1200px] min-h-[700px] bg-white rounded-[24px] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-100 transition-all duration-300">
        
        {/* Left Section - 45% (Visible on Desktop, hidden/stacked on mobile) */}
        <div className="w-full md:w-[45%] h-[350px] md:h-auto relative overflow-hidden bg-slate-100 md:flex flex-col">
          {/* Waiting Room Image Background */}
          <img 
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200" 
            alt="Hospital Waiting Room" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* White transparent overlay with light blue gradient tint + slight blur */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/80 to-[#0F9B8E]/30 backdrop-blur-[2px]" />
          
          {/* Left Panel Content */}
          <div className="relative z-10 h-full flex flex-col justify-between p-8 md:p-10 select-none">
            {/* Logo area */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#0F9B8E]/10 rounded-xl flex items-center justify-center border border-[#0F9B8E]/20 text-[#0F9B8E] shadow-sm">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 tracking-tight text-lg leading-none">CarePlus</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">HOSPITAL</span>
              </div>
            </div>

            {/* Mid benefit text */}
            <div className="my-8 md:my-0 flex-1 flex flex-col justify-center">
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">
                {isSignUp ? 'Join CarePlus' : 'Patient Login'}
              </h1>
              <p className="text-sm text-slate-600 font-medium mt-3 max-w-sm">
                {isSignUp 
                  ? 'Sign up to register a secure portal account and access our advanced digital healthcare services.' 
                  : 'Welcome back! Please login to your account.'}
              </p>

              {/* Feature Cards List (Hidden below form on mobile) */}
              <div className="hidden md:flex flex-col gap-4 mt-8">
                {/* Card 1 */}
                <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:translate-x-1 hover:bg-white/90">
                  <div className="w-10 h-10 rounded-xl bg-[#0F9B8E]/10 flex items-center justify-center text-[#0F9B8E] shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Book Appointments</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Schedule and manage your appointments</p>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:translate-x-1 hover:bg-white/90">
                  <div className="w-10 h-10 rounded-xl bg-[#0F9B8E]/10 flex items-center justify-center text-[#0F9B8E] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Medical Records</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">View your medical history and reports</p>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:translate-x-1 hover:bg-white/90">
                  <div className="w-10 h-10 rounded-xl bg-[#0F9B8E]/10 flex items-center justify-center text-[#0F9B8E] shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Prescriptions</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Access your prescriptions and medications</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer rights text */}
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:block">
              &copy; 2026 CareSync HMS. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Section - 55% */}
        <div className="w-full md:w-[55%] flex flex-col justify-center px-6 md:px-16 py-8 overflow-y-auto bg-[#FFFFFF]">
          <div className="w-full max-w-md mx-auto flex flex-col">
            
            {/* Round Avatar Icon Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-tr from-[#0F9B8E] to-[#12B3A7] rounded-full flex items-center justify-center text-white shadow-md shadow-[#0F9B8E]/25">
                {isSignUp ? <UserCheck className="w-9 h-9" /> : <User className="w-9 h-9" />}
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 mt-4 tracking-tight">
                {isSignUp ? 'Create your account' : 'Login to your account'}
              </h2>
            </div>

            {/* Login View Form */}
            {!isSignUp ? (
              <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-5">
                {/* Mobile number or email field */}
                <div className="flex flex-col text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Mobile Number or Email</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400">
                      <Phone className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter your mobile number or email"
                      className={`w-full pl-11 pr-4 py-3 bg-slate-50 border ${
                        loginErrors.mobileNumber ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                      } rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                      {...loginRegister('mobileNumber', {
                        required: 'Mobile number or email is required',
                        validate: (value) => {
                          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                          const isPhone = /^[6-9]\d{9}$/.test(value);
                          return isEmail || isPhone || 'Must be a valid email or 10-digit mobile number';
                        }
                      })}
                    />
                  </div>
                  {loginErrors.mobileNumber && (
                    <span className="text-red-500 text-[11px] font-semibold mt-1 pl-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {loginErrors.mobileNumber.message}
                    </span>
                  )}
                </div>

                {/* Password field */}
                <div className="flex flex-col text-left">
                  <div className="flex justify-between items-center mb-1.5 pl-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-[11px] font-bold text-[#0F9B8E] hover:underline cursor-pointer focus:outline-none"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400">
                      <Lock className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className={`w-full pl-11 pr-11 py-3 bg-slate-50 border ${
                        loginErrors.password ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                      } rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                      {...loginRegister('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters long'
                        }
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <span className="text-red-500 text-[11px] font-semibold mt-1 pl-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {loginErrors.password.message}
                    </span>
                  )}
                </div>

                {/* Conditional Hospital Code Input */}
                {needHospitalCode && (
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5">Hospital Code *</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-slate-400">
                        <Building className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Enter your hospital code"
                        className={`w-full pl-11 pr-4 py-3 bg-slate-50 border ${
                          loginErrors.hospitalCode ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                        } rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 uppercase`}
                        {...loginRegister('hospitalCode', { required: needHospitalCode ? 'Hospital code is required' : false })}
                      />
                    </div>
                    {loginErrors.hospitalCode && (
                      <span className="text-red-500 text-[11px] font-semibold mt-1 pl-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {loginErrors.hospitalCode.message}
                      </span>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7] hover:shadow-lg hover:shadow-[#0F9B8E]/20 text-white font-bold text-sm rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <LogIn className="w-4.5 h-4.5" />
                      <span>Login</span>
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-xs text-slate-400 font-bold uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* OTP Login Outline Button */}
                <button
                  type="button"
                  onClick={handleOtpLogin}
                  disabled={loading}
                  className="w-full py-3 bg-white border border-[#0F9B8E]/30 hover:border-[#0F9B8E] hover:bg-[#0F9B8E]/5 text-[#0F9B8E] font-bold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none"
                >
                  <Shield className="w-4.5 h-4.5" />
                  <span>Login with OTP</span>
                </button>

                {/* Bottom link to Register */}
                <div className="text-center mt-6 text-sm text-slate-500 font-medium">
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    onClick={() => navigate('/register')}
                    className="text-[#0F9B8E] font-bold hover:underline focus:outline-none"
                  >
                    Register Now
                  </button>
                </div>
              </form>
            ) : (
              
              /* Sign Up / Registration Form */
              <form onSubmit={handleSignUpSubmit(onSignUpSubmit)} className="space-y-4">
                
                {/* Row 1: Full Name & DoB */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Full Name</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-slate-400">
                        <User className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border ${
                          signUpErrors.fullName ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                        } rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-4 transition-all`}
                        {...signUpRegister('fullName', { required: 'Full name is required' })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Date of Birth</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-slate-400">
                        <Calendar className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border ${
                          signUpErrors.dob ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                        } rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-4 transition-all`}
                        {...signUpRegister('dob', { required: 'Date of birth is required' })}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Email & Mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Email Address</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-slate-400">
                        <Mail className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type="email"
                        placeholder="Enter email address"
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border ${
                          signUpErrors.email ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                        } rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-4 transition-all`}
                        {...signUpRegister('email', { required: 'Email address is required' })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Mobile Number</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-slate-400">
                        <Phone className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="10-digit mobile"
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border ${
                          signUpErrors.mobile ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                        } rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-4 transition-all`}
                        {...signUpRegister('mobile', { 
                          required: 'Mobile number is required',
                          pattern: { value: /^\d{10}$/, message: 'Must be exactly 10 digits' }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Password & Confirm Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Password</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-slate-400">
                        <Lock className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 border ${
                          signUpErrors.password ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                        } rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-4 transition-all`}
                        {...signUpRegister('password', { required: 'Password is required', minLength: 6 })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 text-slate-400 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Confirm Password</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-slate-400">
                        <Lock className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm"
                        className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 border ${
                          signUpErrors.confirmPassword ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                        } rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-4 transition-all`}
                        {...signUpRegister('confirmPassword', { required: 'Confirm password is required' })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 text-slate-400 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 4: Gender & Blood Group */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Gender</label>
                    <div className="flex gap-4 items-center h-10 pl-1">
                      {['Male', 'Female', 'Other'].map(g => (
                        <label key={g} className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                          <input 
                            type="radio" 
                            value={g} 
                            className="text-[#0F9B8E] focus:ring-[#0F9B8E]"
                            {...signUpRegister('gender')} 
                          />
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Blood Group</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0F9B8E] focus:ring-4 focus:ring-[#0F9B8E]/10 transition-all"
                      {...signUpRegister('bloodGroup', { required: 'Blood group is required' })}
                    >
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 5: Full Address */}
                <div className="flex flex-col text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Full Address</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400">
                      <MapPin className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter your full address"
                      className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border ${
                        signUpErrors.address ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                      } rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-4 transition-all`}
                      {...signUpRegister('address', { required: 'Address is required' })}
                    />
                  </div>
                </div>

                {/* Agreement checkbox */}
                <div className="flex items-center text-left py-1">
                  <input
                    type="checkbox"
                    id="agreeCheckbox"
                    className="rounded text-[#0F9B8E] focus:ring-[#0F9B8E] h-4 w-4 border-slate-300"
                    {...signUpRegister('agree', { required: true })}
                  />
                  <label htmlFor="agreeCheckbox" className="ml-2 text-[11px] text-slate-500 font-semibold cursor-pointer">
                    I agree to the <span className="text-[#0F9B8E] hover:underline">Terms of Service</span> and <span className="text-[#0F9B8E] hover:underline">Privacy Policy</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-[#0F9B8E] to-[#12B3A7] hover:shadow-lg hover:shadow-[#0F9B8E]/20 text-white font-bold text-sm rounded-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <LogIn className="w-4.5 h-4.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>

                {/* Bottom link to Login */}
                <div className="text-center mt-4 text-sm text-slate-500 font-medium">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    onClick={() => navigate('/login')}
                    className="text-[#0F9B8E] font-bold hover:underline focus:outline-none"
                  >
                    Login here
                  </button>
                </div>
              </form>
            )}

            {/* Mobile Footer (visible on mobile stack layout) */}
            <p className="text-center mt-8 text-[10px] text-slate-400 font-semibold uppercase tracking-wider block md:hidden">
              &copy; 2026 CareSync HMS. All rights reserved.
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}
