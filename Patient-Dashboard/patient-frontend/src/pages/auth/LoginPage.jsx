import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ToastContainer, toast } from '../../utils/toast';
import './LoginPage.css';

const LoginPage = ({ defaultSignUp = false }) => {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(defaultSignUp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({
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
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLoginChange = (e) => {
    setLoginForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSignUpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignUpForm((p) => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!signUpForm.agree) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (signUpForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register({
        full_name: signUpForm.fullName,
        email: signUpForm.email,
        password: signUpForm.password,
        dob: signUpForm.dob,
        gender: signUpForm.gender,
        phone: signUpForm.mobile,
        address: signUpForm.address,
        blood_group: signUpForm.bloodGroup
      });
      setSuccess('Account created successfully! Logging in...');
      setTimeout(() => {
        // Auth state automatically updates after register callback completes
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ToastContainer />
    <div className="auth-portal-container fade-in">
      <div className="auth-split-wrapper">
        
        {/* Left Column: Hospital Info Panel */}
        <div className="info-panel-side">
          <div className="info-panel-overlay"></div>
          <div className="info-panel-content">
            <div className="brand-logo-area">
              <div className="logo-box">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="logo-title">{import.meta.env.VITE_HOSPITAL_NAME || 'CarePlus'} <span className="logo-subtitle">{import.meta.env.VITE_HOSPITAL_SUBTITLE || 'HOSPITAL'}</span></span>
            </div>

            <div className="benefit-intro-section">
              <h2>{isSignUp ? "Create Your Account" : "Patient Login"}</h2>
              <p className="intro-desc">
                {isSignUp 
                  ? `Join ${import.meta.env.VITE_HOSPITAL_NAME || 'CarePlus'} ${import.meta.env.VITE_HOSPITAL_SUBTITLE || 'Hospital'} to manage your health easily and securely.` 
                  : "Welcome back! Please login to your account to access portal."
                }
              </p>
            </div>

            {/* List of Benefits */}
            <div className="benefits-list">
              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Book Appointments</h4>
                  <p>Schedule appointments with your preferred doctor</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Access Medical Records</h4>
                  <p>View your history, reports and prescriptions anytime</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Get Reminders</h4>
                  <p>Stay updated with appointment reminders and notifications</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Secure & Private</h4>
                  <p>Your data is encrypted and 100% confidential</p>
                </div>
              </div>
            </div>

            {/* Bottom Card */}
            <div className="banner-ad-card">
              <div className="ad-icon">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.9L10 9.715l7.834-4.816A2 2 0 0016 3H4a2 2 0 00-1.834 1.9zM18 7.378l-7.464 4.593a1 1 0 01-1.072 0L2 7.378V15a2 2 0 002 2h12a2 2 0 002-2V7.378z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ad-text">
                <h5>Your Health, Our Priority</h5>
                <p>Sign up today and take control of your health journey with {import.meta.env.VITE_HOSPITAL_NAME || 'CarePlus'} {import.meta.env.VITE_HOSPITAL_SUBTITLE || 'Hospital'}.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Card Form Area */}
        <div className="form-panel-side">
          <div className="auth-card card slide-up">
            
            {/* Round Avatar Icon Header */}
            <div className="round-avatar-header">
              <div className="avatar-circle">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-theme" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {isSignUp ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  )}
                </svg>
              </div>
              <h3>{isSignUp ? "Sign Up" : "Login to your account"}</h3>
              <p className="avatar-subtext">{isSignUp ? "Create your account to get started" : "Please enter credentials to continue"}</p>
            </div>

            {error && <div className="auth-alert alert-error fade-in">{error}</div>}
            {success && <div className="auth-alert alert-success fade-in">{success}</div>}

            {/* Render Sign In Form */}
            {!isSignUp ? (
              <form onSubmit={handleLoginSubmit} className="auth-form flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">Email or Mobile Number</label>
                  <div className="input-icon-wrapper">
                    <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="text"
                      name="email"
                      className="form-input"
                      placeholder="patient@hospital.com or mobile"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="flex justify-between items-center">
                    <label className="form-label">Password</label>
                    <a href="#forgot" className="forgot-pass-link" onClick={(e) => { e.preventDefault(); toast.info("Use patient123 to login."); }}>Forgot Password?</a>
                  </div>
                  <div className="input-icon-wrapper">
                    <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className="form-input"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? <span className="loading-spinner-small"></span> : (
                    <span className="flex items-center gap-2">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      Login
                    </span>
                  )}
                </button>

                <div className="auth-separator">or</div>

                <button type="button" className="btn btn-secondary auth-social-btn" onClick={() => toast.info("Google Login demo triggered.")}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.694 0-8.503-3.809-8.503-8.503 0-4.694 3.809-8.503 8.503-8.503 2.17 0 3.969.762 5.378 2.132l3.061-3.061C18.252.88 15.49 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.64 0 12.24-4.8 12.24-12.24 0-.78-.073-1.464-.207-1.955H12.24z"/>
                  </svg>
                  <span>Login with OTP</span>
                </button>

                {/* Pre-filled info box */}
                <div className="prefilled-demo-box">
                  <p className="demo-title">👋 New here?</p>
                  <p>Click <strong>Register Now</strong> below to create your account, then login with those credentials.</p>
                </div>

                <div className="auth-footer-text">
                  Don't have an account? <button type="button" onClick={() => setIsSignUp(true)} className="link-btn">Register Now</button>
                </div>
              </form>
            ) : (
              
              /* Render Sign Up Form */
              <form onSubmit={handleSignUpSubmit} className="auth-form flex flex-col gap-4">
                
                <div className="grid-2-cols">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div className="input-icon-wrapper">
                      <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <input
                        type="text"
                        name="fullName"
                        className="form-input"
                        placeholder="Enter your full name"
                        value={signUpForm.fullName}
                        onChange={handleSignUpChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <div className="input-icon-wrapper">
                      <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="text"
                        name="dob"
                        className="form-input"
                        placeholder="DD / MM / YYYY"
                        value={signUpForm.dob}
                        onChange={handleSignUpChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid-2-cols">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="input-icon-wrapper">
                      <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="email"
                        name="email"
                        className="form-input"
                        placeholder="Enter your email address"
                        value={signUpForm.email}
                        onChange={handleSignUpChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <div className="input-icon-wrapper">
                      <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input
                        type="text"
                        name="mobile"
                        className="form-input"
                        placeholder="Enter your mobile number"
                        value={signUpForm.mobile}
                        onChange={handleSignUpChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid-2-cols">
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-icon-wrapper">
                      <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        className="form-input"
                        placeholder="Create a password"
                        value={signUpForm.password}
                        onChange={handleSignUpChange}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <div className="input-icon-wrapper">
                      <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        className="form-input"
                        placeholder="Confirm your password"
                        value={signUpForm.confirmPassword}
                        onChange={handleSignUpChange}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid-2-cols">
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <div className="gender-radio-group flex gap-4 mt-2">
                      <label className="radio-label flex items-center gap-1">
                        <input type="radio" name="gender" value="Male" checked={signUpForm.gender === 'Male'} onChange={handleSignUpChange} />
                        <span>Male</span>
                      </label>
                      <label className="radio-label flex items-center gap-1">
                        <input type="radio" name="gender" value="Female" checked={signUpForm.gender === 'Female'} onChange={handleSignUpChange} />
                        <span>Female</span>
                      </label>
                      <label className="radio-label flex items-center gap-1">
                        <input type="radio" name="gender" value="Other" checked={signUpForm.gender === 'Other'} onChange={handleSignUpChange} />
                        <span>Other</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <div className="input-icon-wrapper">
                      <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                      </svg>
                      <select name="bloodGroup" className="form-select" value={signUpForm.bloodGroup} onChange={handleSignUpChange} required>
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Address</label>
                  <div className="input-icon-wrapper">
                    <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="text"
                      name="address"
                      className="form-input"
                      placeholder="Enter your full address"
                      value={signUpForm.address}
                      onChange={handleSignUpChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={signUpForm.agree}
                      onChange={handleSignUpChange}
                      required
                    />
                    <span>I agree to the <a href="#terms" className="link-text">Terms of Service</a> and <a href="#privacy" className="link-text">Privacy Policy</a></span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? <span className="loading-spinner-small"></span> : (
                    <span className="flex items-center gap-2">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>
                      Create Account
                    </span>
                  )}
                </button>

                <div className="auth-separator">or</div>

                <button type="button" className="btn btn-secondary auth-social-btn" onClick={() => toast.info("Google Sign Up demo triggered.")}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.694 0-8.503-3.809-8.503-8.503 0-4.694 3.809-8.503 8.503-8.503 2.17 0 3.969.762 5.378 2.132l3.061-3.061C18.252.88 15.49 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.64 0 12.24-4.8 12.24-12.24 0-.78-.073-1.464-.207-1.955H12.24z"/>
                  </svg>
                  <span>Sign up with Google</span>
                </button>

                <div className="auth-footer-text">
                  Already have an account? <button type="button" onClick={() => setIsSignUp(false)} className="link-btn">Login here</button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default LoginPage;
