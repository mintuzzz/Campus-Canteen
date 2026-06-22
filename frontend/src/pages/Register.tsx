import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, Hash, BookOpen, Lock, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import axios from 'axios';

export const Register: React.FC = () => {
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
      const res = await axios.post(`${API_URL}/auth/register`, data);
      login(res.data);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl glass-premium rounded-3xl p-8 border border-slate-800 animate-fadeIn relative">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 text-amber-500">
            <ShieldCheck size={24} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-100 tracking-tight">Create Student Account</h2>
        <p className="text-center text-slate-400 text-xs mt-1 mb-8">Access pre-orders, daily menu, and submit reviews</p>

        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300 leading-normal">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
                  {...register('name', { required: 'Name is required' })}
                />
              </div>
              {errors.name && <span className="text-[10px] text-red-400">{errors.name.message as string}</span>}
            </div>

            {/* Student ID */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Student ID</label>
              <div className="relative">
                <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="STU2026101"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
                  {...register('studentId', { required: 'Student ID is required' })}
                />
              </div>
              {errors.studentId && <span className="text-[10px] text-red-400">{errors.studentId.message as string}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Department</label>
              <div className="relative">
                <BookOpen size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Computer Science"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
                  {...register('department', { required: 'Department is required' })}
                />
              </div>
              {errors.department && <span className="text-[10px] text-red-400">{errors.department.message as string}</span>}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  placeholder="9876543210"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
                  {...register('phone', { 
                    required: 'Phone number is required',
                    pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digit number' }
                  })}
                />
              </div>
              {errors.phone && <span className="text-[10px] text-red-400">{errors.phone.message as string}</span>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Campus Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                placeholder="you@college.edu"
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
                {...register('email', { required: 'Email address is required' })}
              />
            </div>
            {errors.email && <span className="text-[10px] text-red-400">{errors.email.message as string}</span>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
              />
            </div>
            {errors.password && <span className="text-[10px] text-red-400">{errors.password.message as string}</span>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 text-xs mt-6 disabled:opacity-50"
          >
            {loading ? 'Creating profile account...' : 'Create Account'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-amber-500 font-semibold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
};
