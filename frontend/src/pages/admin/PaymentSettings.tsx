import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { CreditCard, Save, RefreshCw, KeyRound, Building2, FileSignature, Sparkles } from 'lucide-react';
import axios from 'axios';

export const PaymentSettings: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [notePrefix, setNotePrefix] = useState('CC');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const headers = { Authorization: `Bearer ${user?.token}` };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/settings/payment`, { headers });
      setUpiId(res.data.upiId || '');
      setPayeeName(res.data.payeeName || '');
      setNotePrefix(res.data.notePrefix || 'CC');
    } catch (err: any) {
      console.error(err);
      addToast('Error', 'Failed to retrieve payment settings.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim() || !payeeName.trim()) {
      addToast('Validation Error', 'UPI ID and payee name are required.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const res = await axios.put(
        `${API_URL}/settings/payment`,
        { upiId: upiId.trim(), payeeName: payeeName.trim(), notePrefix: notePrefix.trim().toUpperCase() },
        { headers }
      );
      addToast('Settings Updated', res.data.message || 'Canteen settings saved.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Update Failed', err.response?.data?.message || 'Server error saving settings.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs animate-pulse">Loading merchant parameters...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <CreditCard className="text-amber-500" size={24} />
            UPI Merchant Settings
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure the payee details used for generating dynamic UPI payment QR codes on student checkout.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all active:scale-95"
          title="Refresh parameters"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="glass-premium rounded-3xl p-6 border border-slate-800 space-y-5">
            {/* Payee Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={12} className="text-amber-500/80" /> Payee / Merchant Name
              </label>
              <input
                type="text"
                value={payeeName}
                onChange={e => setPayeeName(e.target.value)}
                placeholder="e.g. Campus Canteen Store"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-amber-500 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* UPI ID */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound size={12} className="text-amber-500/80" /> Canteen UPI ID (VPA)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="e.g. merchant@okicici"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-amber-500 rounded-xl py-3 px-4 text-xs text-slate-200 font-mono focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Note Prefix */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileSignature size={12} className="text-amber-500/80" /> Reference Code Prefix
              </label>
              <input
                type="text"
                maxLength={4}
                value={notePrefix}
                onChange={e => setNotePrefix(e.target.value.replace(/[^A-Za-z]/g, ''))}
                placeholder="e.g. CC"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-amber-500 rounded-xl py-3 px-4 text-xs text-slate-200 font-bold focus:outline-none uppercase transition-colors"
                required
              />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Appended to the transaction note. Creates references like <strong className="text-slate-400">{notePrefix.toUpperCase() || 'CC'}-{new Date().getFullYear()}-000101</strong>. Letters only.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 text-slate-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
            >
              {saving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Saving changes...
                </>
              ) : (
                <>
                  <Save size={13} /> Update Merchant Configuration
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Column */}
        <div className="md:col-span-1 space-y-4">
          <div className="glass rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" /> Active Settings Preview
            </h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">UPI Payment Note Format</p>
                <p className="font-mono text-slate-300 mt-0.5">{notePrefix.toUpperCase() || 'CC'}-{new Date().getFullYear()}-XXXXXX</p>
              </div>
              
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Receiver VPA</p>
                <p className="font-mono text-slate-300 mt-0.5 break-all">{upiId || 'Not Configured'}</p>
              </div>

              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Receiver Display Name</p>
                <p className="text-slate-300 mt-0.5">{payeeName || 'Not Configured'}</p>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-3 leading-relaxed">
              When students choose **UPI** at checkout, a QR code matching this exact payee VPA and amount will be generated. The prefix will lock transaction ID tracking to match incoming screenshot uploads.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
