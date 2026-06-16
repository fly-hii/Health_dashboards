import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { KeyRound, Mail, ArrowRight, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import API from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.warning('Please enter email and password');
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('admin_token', res.data.token);
        localStorage.setItem('admin_user', JSON.stringify(res.data.user));
        toast.success(`Welcome back, ${res.data.user.name}`);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Login failed, check credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slateBg">
      {/* Left side: Premium branding & illustration */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar-bg text-white relative overflow-hidden">
        {/* Background mesh effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-wide">CAREPLUS</span>
        </div>

        {/* Title */}
        <div className="max-w-md my-auto">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Integrated Hospital <span className="text-primary">Hospital Admin</span> Portal
          </h2>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed">
            Monitor real-time patient admissions, queue updates, prescription compliance, billing audits, and analytics feeds through a single robust, unified dashboard.
          </p>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} CarePlus Healthcare Systems. All rights reserved.
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-wide text-sidebar-bg">CAREPLUS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Login</h1>
            <p className="text-sm text-slate-500 mt-1">Please enter your Hospital administrative credentials to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <Mail className="w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@careplus.com"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Password</label>
                <a href="#forgot" className="text-xs text-primary hover:underline">Forgot password?</a>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all relative">
                <KeyRound className="w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Demo Credentials alert box */}
            <div className="flex items-start gap-3 p-4 bg-primary-bg border border-primary/20 rounded-xl text-xs text-primary-dark">
              <ShieldAlert className="w-5 h-5 shrink-0 text-primary" />
              <div>
                <span className="font-bold">Development Mode:</span> Use pre-seeded credential <code className="bg-primary/10 px-1 py-0.5 rounded font-mono font-bold">admin@careplus.com</code> / <code className="bg-primary/10 px-1 py-0.5 rounded font-mono font-bold">admin123</code>.
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-primary/20"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
