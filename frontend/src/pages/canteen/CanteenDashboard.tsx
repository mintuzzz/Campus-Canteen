import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ChefHat, ClipboardList, UtensilsCrossed, KeyRound, CheckCircle2, XCircle, Loader, Clock, ShieldAlert } from 'lucide-react';
import axios from 'axios';

interface OrderSummary {
  _id: string;
  tokenNumber: string;
  pickupToken: string;
  token: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  items: { name: string; quantity: number }[];
  userId: { name: string; studentId: string };
  createdAt: string;
}

export const CanteenDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, addToast } = useSocket();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string; order?: any } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const headers = { Authorization: `Bearer ${user?.token}` };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders?status=Active`, { headers });
      // Show only active orders (not Completed/Cancelled)
      const active = res.data.filter((o: OrderSummary) =>
        !['Completed', 'Cancelled', 'Pending Payment', 'Refunded'].includes(o.status)
      );
      setOrders(active);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('newOrder', (o: OrderSummary) => {
      setOrders(prev => [o, ...prev]);
      addToast('New Order', `Token ${o.pickupToken || o.tokenNumber} arrived`, 'info');
    });
    socket.on('orderStatusChanged', (o: OrderSummary) => {
      setOrders(prev => prev.map(existing => existing._id === o._id ? o : existing)
        .filter(existing => !['Completed', 'Cancelled'].includes(existing.status)));
    });
    return () => { socket.off('newOrder'); socket.off('orderStatusChanged'); };
  }, [socket]);

  const handleStatusUpdate = async (orderId: string, nextStatus: string, token: string) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/status`, { status: nextStatus }, { headers });
      addToast('Status Updated', `Token ${token} → ${nextStatus}`, 'success');
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to update status', 'warning');
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await axios.post(`${API_URL}/orders/verify-token`, { pickupToken: tokenInput.trim() }, { headers });
      setVerifyResult({ success: true, message: res.data.message, order: res.data.order });
      setTokenInput('');
      addToast('Pickup Complete!', `Order completed for ${res.data.order?.userId?.name}`, 'success');
    } catch (err: any) {
      setVerifyResult({ success: false, message: err.response?.data?.message || 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'Pending' || s === 'Accepted') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (s === 'Preparing') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (s === 'Ready') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return 'text-slate-400 bg-slate-800 border-slate-700';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-teal-400 mb-1">
            <ChefHat size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Canteen Staff</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Kitchen Dashboard</h1>
          <p className="text-slate-400 text-xs mt-1">Welcome, {user?.name}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/canteen/orders" className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
            <ClipboardList size={13} /> All Orders
          </Link>
          <Link to="/canteen/menu" className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-teal-500/20">
            <UtensilsCrossed size={13} /> Menu
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Verification Box */}
        <div className="lg:col-span-1">
          <div className="glass-premium rounded-3xl p-6 border border-teal-500/20">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={16} className="text-teal-400" />
              <h2 className="text-sm font-bold text-slate-100">Verify Pickup Token</h2>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
              When a student presents their token, enter it here to complete the order. The order must be in <strong className="text-slate-300">Ready</strong> status.
            </p>

            <form onSubmit={handleVerifyToken} className="space-y-3">
              <input
                type="text"
                placeholder="CC-2026-XXXXXX"
                value={tokenInput}
                onChange={e => { setTokenInput(e.target.value.toUpperCase()); setVerifyResult(null); }}
                className="w-full bg-slate-950/60 border border-slate-700 focus:border-teal-500 rounded-xl py-3 px-4 text-sm text-slate-200 font-mono tracking-widest text-center focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={verifying || !tokenInput.trim()}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {verifying ? <><Loader size={13} className="animate-spin" /> Verifying...</> : <><CheckCircle2 size={13} /> Complete Pickup</>}
              </button>
            </form>

            {verifyResult && (
              <div className={`mt-4 rounded-xl p-3 border text-xs ${verifyResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                <div className="flex items-start gap-2">
                  {verifyResult.success ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <XCircle size={14} className="shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{verifyResult.message}</span>
                </div>
                {verifyResult.success && verifyResult.order && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 text-emerald-300 text-[10px]">
                    <p><strong>{verifyResult.order.userId?.name}</strong> ({verifyResult.order.userId?.studentId})</p>
                    <p>{verifyResult.order.items?.map((i: any) => `${i.name} x${i.quantity}`).join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Pending', count: orders.filter(o => o.status === 'Pending' || o.status === 'Accepted').length, color: 'text-amber-400' },
              { label: 'Preparing', count: orders.filter(o => o.status === 'Preparing').length, color: 'text-blue-400' },
              { label: 'Ready', count: orders.filter(o => o.status === 'Ready').length, color: 'text-emerald-400' },
              { label: 'Total Active', count: orders.length, color: 'text-teal-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl p-3 border border-slate-800 text-center">
                <p className={`text-xl font-extrabold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Orders Queue */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-teal-400" /> Active Order Queue
            <span className="text-[10px] text-slate-500 font-normal">({orders.length} orders)</span>
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-20 border border-slate-800 animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="glass rounded-3xl p-12 border border-slate-800 text-center">
              <ChefHat size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No active orders right now.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {orders.map(order => {
                const displayToken = order.pickupToken || order.token || order.tokenNumber;
                const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={order._id} className="glass rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                            {displayToken}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="text-[10px] text-slate-500">{timeStr}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate">
                          {order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {order.userId?.name} · {order.paymentMethod} · ₹{order.totalAmount}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        {(order.status === 'Pending' || order.status === 'Accepted') && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'Accepted', displayToken)}
                              className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/20 hover:border-transparent text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                            >Accept</button>
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'Cancelled', displayToken)}
                              className="text-red-400 hover:underline text-[10px] px-2"
                            >Reject</button>
                          </>
                        )}
                        {order.status === 'Accepted' && (
                          <button
                            onClick={() => handleStatusUpdate(order._id, 'Preparing', displayToken)}
                            className="bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 hover:border-transparent text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                          ><Loader size={10} className="animate-spin" /> Prepare</button>
                        )}
                        {order.status === 'Preparing' && (
                          <button
                            onClick={() => handleStatusUpdate(order._id, 'Ready', displayToken)}
                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-transparent text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                          >Mark Ready</button>
                        )}
                        {order.status === 'Ready' && (
                          <div className="text-[10px] text-emerald-400 font-bold text-center">
                            ✓ Awaiting Token
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
