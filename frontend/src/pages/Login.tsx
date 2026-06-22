import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Mail, Lock, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import axios from 'axios';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, data);
      login(res.data);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glass-premium rounded-3xl p-8 border border-slate-800 animate-fadeIn relative">
        {/* Header decoration */}
        <div className="flex justify-center mb-6">
          <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 text-amber-500 animate-pulse">
            <Sparkles size={24} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-100 tracking-tight">Student Portal</h2>
        <p className="text-center text-slate-400 text-xs mt-1 mb-8">Pre-order food and track mess queue times</p>

        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300 leading-normal">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Campus Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                placeholder="you@college.edu"
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none transition-colors"
                {...register('email', { required: 'Email address is required' })}
              />
            </div>
            {errors.email && <span className="text-[10px] text-red-400 font-medium">{errors.email.message as string}</span>}
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-400 font-medium">Password</label>
              <Link to="/forgot-password" className="text-[10px] text-amber-500 hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none transition-colors"
                {...register('password', { required: 'Password is required' })}
              />
            </div>
            {errors.password && <span className="text-[10px] text-red-400 font-medium">{errors.password.message as string}</span>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 text-sm mt-8 disabled:opacity-50"
          >
            {loading ? 'Authenticating session...' : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8">
          New student?{' '}
          <Link to="/register" className="text-amber-500 font-semibold hover:underline">Create an account</Link>
        </p>

        <div className="border-t border-slate-800/80 my-6" />

        <p className="text-center text-xs text-slate-500">
          Are you a staff member?{' '}
          <Link to="/admin/login" className="text-amber-500/80 hover:text-amber-500 font-semibold hover:underline">Admin Login</Link>
        </p>
      </div>
    </div>
  );
};
