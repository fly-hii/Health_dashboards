import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '../../utils/toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Mock forgot password api request delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitted(true);
      toast.success('Password reset link has been sent to your email.');
    } catch (err) {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
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

        {!submitted ? (
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Forgot Password?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Enter the email address associated with your account, and we will send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border ${
                      errors.email ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0F9B8E] focus:ring-[#0F9B8E]/10'
                    } rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                  />
                </div>
                {errors.email && (
                  <span className="text-red-500 text-xs font-semibold mt-2 pl-1 flex items-center gap-1.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4" /> {errors.email.message}
                  </span>
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
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#e6f5f3] rounded-full flex items-center justify-center text-[#0F9B8E] mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">Check Your Email</h3>
            <p className="text-sm text-slate-500 mb-8">
              We have sent a password reset link to your email address. Please follow the instructions to reset your password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-all duration-200"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
