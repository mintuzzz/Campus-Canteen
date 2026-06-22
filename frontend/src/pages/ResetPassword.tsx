import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid or missing password reset token in URL.');
    }
  }, [token]);

  const onSubmit = async (data: any) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        password: data.password,
      });
      setSuccessMsg('Your password has been reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const passwordValue = watch('password');

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glass-premium rounded-3xl p-8 border border-slate-800 animate-fadeIn relative">
        <h2 className="text-2xl font-bold text-center text-slate-100 tracking-tight">Set New Password</h2>
        <p className="text-center text-slate-400 text-xs mt-1 mb-8">Enter your new credentials below</p>

        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300 leading-normal">{errorMsg}</span>
          </div>
        )}

        {successMsg ? (
          <div className="text-center space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex flex-col items-center gap-3">
              <CheckCircle2 size={36} className="text-emerald-400" />
              <p className="text-sm text-emerald-300 font-semibold">{successMsg}</p>
              <p className="text-xs text-slate-400">Redirecting you to the login screen shortly...</p>
            </div>
            <Link to="/login" className="text-xs text-amber-500 hover:underline block">
              Click here if you are not redirected
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none transition-colors"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
              </div>
              {errors.password && <span className="text-[10px] text-red-400 font-medium">{errors.password.message as string}</span>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none transition-colors"
                  {...register('confirmPassword', {
                    required: 'Please confirm password',
                    validate: (value) => value === passwordValue || 'Passwords do not match',
                  })}
                />
              </div>
              {errors.confirmPassword && (
                <span className="text-[10px] text-red-400 font-medium">{errors.confirmPassword.message as string}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 text-sm mt-8 disabled:opacity-50"
            >
              {loading ? 'Resetting password...' : 'Update Password'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
