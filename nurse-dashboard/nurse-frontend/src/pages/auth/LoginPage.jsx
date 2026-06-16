import { useState } from 'react';
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

  const validate = () => {
    const errs = {};
    if (!form.email)    errs.email    = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
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

          {/* Password field */}
          <div className="flex flex-col text-left">
            <div className="flex justify-between items-center mb-1.5 pl-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
              <button
                type="button"
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                onClick={(e) => { e.preventDefault(); toast.info("Please contact your IT administrator to reset your password."); }}
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
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-xl text-left">
          <p className="text-[11px] font-bold text-primary-dark uppercase tracking-wider mb-2 flex items-center gap-1.5">
            🔑 Demo Credentials
          </p>
          <div className="space-y-1 text-xs text-teal-950 font-medium">
            <p>Email: <strong className="font-bold">nurse@hospital.com</strong></p>
            <p>Password: <strong className="font-bold">nurse123</strong></p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center mt-6 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          © {new Date().getFullYear()} CareSync HMS. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
