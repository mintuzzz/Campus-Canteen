import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Package, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

type PaymentState = 'polling' | 'success' | 'failed' | 'error';

interface OrderStatus {
  orderId: string;
  paymentStatus: string;
  status: string;
  orderReference: string;
  totalAmount: number;
}

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const orderId = searchParams.get('orderId');
  const [paymentState, setPaymentState] = useState<PaymentState>('polling');
  const [orderData, setOrderData] = useState<OrderStatus | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const MAX_ATTEMPTS = 20; // Poll for up to ~60 seconds

  const checkStatus = async () => {
    if (!orderId) {
      setPaymentState('error');
      setErrorMsg('No order ID found in URL.');
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/payment/status/${orderId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      const data: OrderStatus = res.data;
      setOrderData(data);

      if (data.paymentStatus === 'Paid') {
        setPaymentState('success');
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      if (data.paymentStatus === 'Failed' || data.status === 'Cancelled') {
        setPaymentState('failed');
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
    } catch (err: any) {
      console.error('Status poll error:', err);
    }

    setAttempts(prev => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPaymentState('error');
        setErrorMsg('Payment verification timed out. Please check your order history or contact support.');
      }
      return next;
    });
  };

  useEffect(() => {
    // Start polling immediately
    checkStatus();
    intervalRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // ── Polling / Loading state ────────────────────────────────────────────────
  if (paymentState === 'polling') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 animate-fadeIn">
        <div className="glass rounded-3xl border border-slate-800 p-10 max-w-sm w-full text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
            <Loader2 className="absolute inset-0 m-auto text-purple-400" size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">Verifying Payment</h2>
          <p className="text-slate-400 text-sm mb-4">
            Please wait while we confirm your payment with PhonePe...
          </p>
          <div className="flex justify-center gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-6">
            Attempt {attempts + 1} of {MAX_ATTEMPTS} · Checking every 3s
          </p>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (paymentState === 'success' && orderData) {
    const finalAmount = Number((orderData.totalAmount * 1.05).toFixed(2));
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 animate-fadeIn">
        <div className="glass rounded-3xl border border-green-500/30 p-10 max-w-sm w-full text-center">
          {/* Animated success icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-0 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={48} className="text-green-400" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-100 mb-1">Payment Successful! 🎉</h1>
          <p className="text-slate-400 text-sm mb-6">Your order is confirmed and being prepared.</p>

          {/* Order info */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 mb-6 text-left space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Order Ref</span>
              <span className="text-slate-100 font-mono font-bold">{orderData.orderReference || orderData.orderId.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount Paid</span>
              <span className="text-green-400 font-bold">₹{finalAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className="text-green-400 font-semibold flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Accepted
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/tracking/${orderData.orderId}`)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all mb-3"
          >
            <Package size={16} /> Track My Order <ArrowRight size={14} />
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm transition-colors"
          >
            Order More Food
          </button>
        </div>
      </div>
    );
  }

  // ── Failed state ───────────────────────────────────────────────────────────
  if (paymentState === 'failed') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 animate-fadeIn">
        <div className="glass rounded-3xl border border-red-500/30 p-10 max-w-sm w-full text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <XCircle size={48} className="text-red-400" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 mb-2">Payment Failed</h1>
          <p className="text-slate-400 text-sm mb-6">
            Your payment was not completed. No money has been deducted.
          </p>

          <button
            onClick={() => navigate('/cart')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 mb-3"
          >
            <RotateCcw size={16} /> Try Again
          </button>
          <button
            onClick={() => navigate('/history')}
            className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            View Order History
          </button>
        </div>
      </div>
    );
  }

  // ── Error / timeout state ─────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 animate-fadeIn">
      <div className="glass rounded-3xl border border-amber-500/30 p-10 max-w-sm w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center">
          <XCircle size={48} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-100 mb-2">Verification Pending</h1>
        <p className="text-slate-400 text-sm mb-2">{errorMsg}</p>
        <p className="text-slate-500 text-xs mb-6">
          If money was deducted, it will be refunded within 5–7 business days. Check your order history to see if the order went through.
        </p>

        <button
          onClick={() => navigate('/history')}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 mb-3"
        >
          Check Order History
        </button>
        <button
          onClick={() => navigate('/cart')}
          className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          Back to Cart
        </button>
      </div>
    </div>
  );
};
