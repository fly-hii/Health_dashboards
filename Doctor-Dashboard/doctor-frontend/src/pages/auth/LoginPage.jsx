import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

export default function LoginPage({ defaultSignUp = false }) {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(defaultSignUp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({ email: 'rohit@hospital.com', password: 'doctor123' });
  const [signUpForm, setSignUpForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    department: 'General Medicine',
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
        name: signUpForm.name,
        email: signUpForm.email,
        password: signUpForm.password,
        phone: signUpForm.phone,
        department: signUpForm.department,
        role: 'doctor'
      });
      setSuccess('Doctor account registered successfully!');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <h2>{isSignUp ? "Doctor Sign Up" : "Doctor Login"}</h2>
              <p className="intro-desc">
                {isSignUp 
                  ? `Join ${import.meta.env.VITE_HOSPITAL_NAME || 'CarePlus'} ${import.meta.env.VITE_HOSPITAL_SUBTITLE || 'Hospital'} medical staff to consult patients and manage prescriptions.` 
                  : "Welcome back! Please login to your clinical doctor account."
                }
              </p>
            </div>

            {/* List of Benefits */}
            <div className="benefits-list">
              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Consultations</h4>
                  <p>Manage and view your consultations</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Prescriptions</h4>
                  <p>Create and manage patient prescriptions</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="benefit-details">
                  <h4>Patient Records</h4>
                  <p>Access patient history and consultation documents</p>
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
                <p>Register your doctor account and collaborate to manage clinical outcomes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form Area */}
        <div className="form-panel-side">
          <div className="auth-card card slide-up">
            
            {/* Round Avatar Icon Header */}
            <div className="round-avatar-header">
              <div className="avatar-circle">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-theme" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3>{isSignUp ? "Doctor Sign Up" : "Login to your account"}</h3>
              <p className="avatar-subtext">{isSignUp ? "Create a doctor staff account to get started" : "Please enter credentials to continue"}</p>
            </div>

            {error && <div className="auth-alert alert-error fade-in">{error}</div>}
            {success && <div className="auth-alert alert-success fade-in">{success}</div>}

            {/* Render Sign In Form */}
            {!isSignUp ? (
              <form onSubmit={handleLoginSubmit} className="auth-form flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">Doctor ID or Email</label>
                  <div className="input-icon-wrapper">
                    <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.378 0 2.4-1.1 3-2.5M12 14a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="text"
                      name="email"
                      className="form-input"
                      placeholder="Enter your doctor ID or email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="flex justify-between items-center">
                    <label className="form-label">Password</label>
                    <a href="#forgot" className="forgot-pass-link" onClick={(e) => { e.preventDefault(); console.log("Use doctor123 to login."); }}>Forgot Password?</a>
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
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? <span className="loading-spinner-small"></span> : 'Login'}
                </button>

                <div className="auth-separator">or</div>

                <button type="button" className="btn btn-secondary auth-social-btn" onClick={() => console.log("Google OTP verification placeholder.")}>
                  Verify via Mobile OTP
                </button>

                <div className="prefilled-demo-box">
                  <p className="demo-title">🔑 Demo Doctor Credentials:</p>
                  <p>Email: <strong>rohit@hospital.com</strong></p>
                  <p>Password: <strong>doctor123</strong></p>
                </div>

                <div className="auth-footer-text">
                  Need a staff account? <button type="button" onClick={() => setIsSignUp(true)} className="link-btn">Register here</button>
                </div>
              </form>
            ) : (
              
              /* Render Sign Up Form */
              <form onSubmit={handleSignUpSubmit} className="auth-form flex flex-col gap-4">
                
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-icon-wrapper">
                    <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      placeholder="Enter your full name"
                      value={signUpForm.name}
                      onChange={handleSignUpChange}
                      required
                    />
                  </div>
                </div>

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

                <div className="grid-2-cols">
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <div className="input-icon-wrapper">
                      <svg className="form-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input
                        type="text"
                        name="phone"
                        className="form-input"
                        placeholder="Enter contact number"
                        value={signUpForm.phone}
                        onChange={handleSignUpChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Clinical Specialization</label>
                    <div className="input-icon-wrapper">
                      <select name="department" className="form-select" value={signUpForm.department} onChange={handleSignUpChange} required>
                        <option value="General Medicine">General Medicine</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Emergency">Emergency</option>
                      </select>
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
                        placeholder="Create password"
                        value={signUpForm.password}
                        onChange={handleSignUpChange}
                        required
                      />
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
                        placeholder="Confirm password"
                        value={signUpForm.confirmPassword}
                        onChange={handleSignUpChange}
                        required
                      />
                    </div>
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
                    <span>I agree to the Terms of Service and Privacy Policy</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? <span className="loading-spinner-small"></span> : 'Create Doctor Account'}
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
  );
}
