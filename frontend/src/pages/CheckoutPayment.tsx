import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  ArrowLeft,
  Banknote,
  Smartphone,
  Loader2,
  IndianRupee,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import axios from 'axios';

// Declare Razorpay on window for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Load Razorpay checkout script dynamically
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const CheckoutPayment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { addToast } = useSocket();

  const { paymentMethod, amount, items } = (location.state as {
    paymentMethod: 'UPI' | 'Cash On Pickup';
    amount: number;
    items: Array<{ foodId: string; quantity: number; price: number; name: string; image: string }>;
  }) || {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const tax = Number((amount * 0.05).toFixed(2));
  const finalTotal = Number((amount + tax).toFixed(2));

  // Pre-load Razorpay script
  useEffect(() => {
    if (paymentMethod === 'UPI') loadRazorpayScript();
  }, [paymentMethod]);

  if (!paymentMethod || !items) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <AlertCircle className="text-red-400 mx-auto mb-4" size={36} />
        <p className="text-slate-300 text-sm">Invalid checkout session. Please go back to your cart.</p>
        <button onClick={() => navigate('/cart')} className="mt-6 bg-amber-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm">
          Back to Cart
        </button>
      </div>
    );
  }

  // ── Razorpay UPI Payment ──────────────────────────────────────────────────
  const handleRazorpayPayment = async () => {
    setError('');
    setLoading(true);

    if (!user?.token) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${user.token}` };

      // Step 1: Create canteen order in DB
      const orderRes = await axios.post(
        `${API_URL}/orders`,
        {
          items: items.map(i => ({ foodId: i.foodId, quantity: i.quantity, name: i.name, image: i.image })),
          paymentMethod: 'UPI',
        },
        { headers }
      );
      const canteenOrderId = orderRes.data.order._id;

      // Step 2: Create Razorpay order → get rzpOrderId + keyId
      const payRes = await axios.post(`${API_URL}/payment/initiate`, { orderId: canteenOrderId }, { headers });
      const { rzpOrderId, amount: rzpAmount, currency, keyId, orderReference, userName, userEmail, userPhone } = payRes.data;

      // Step 3: Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Failed to load payment gateway. Please check your internet connection.');
        setLoading(false);
        return;
      }

      setLoading(false);

      // Step 4: Open Razorpay checkout popup
      const options = {
        key: keyId,
        amount: rzpAmount,
        currency,
        name: 'Campus Canteen',
        description: `Order ${orderReference || canteenOrderId}`,
        order_id: rzpOrderId,
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
        theme: { color: '#8b5cf6' },
        modal: {
          ondismiss: () => {
            addToast('Payment cancelled. Your order is saved — you can retry from order history.', 'error');
            navigate(`/tracking/${canteenOrderId}`);
          },
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            // Step 5: Verify payment on backend
            await axios.post(
              `${API_URL}/payment/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: canteenOrderId,
              },
              { headers }
            );
            clearCart();
            addToast('Payment successful! 🎉', 'success');
            navigate(`/payment/success?orderId=${canteenOrderId}`);
          } catch (verifyErr) {
            addToast('Payment received but verification failed. Contact support.', 'error');
            navigate(`/tracking/${canteenOrderId}`);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        addToast('Payment failed. Please try again.', 'error');
        navigate(`/tracking/${canteenOrderId}`);
      });
      rzp.open();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Payment initiation failed. Please try again.';
      setError(msg);
      addToast(msg, 'error');
      setLoading(false);
    }
  };

  // ── Cash on Pickup ────────────────────────────────────────────────────────
  const handleCashOrder = async () => {
    setError('');
    setLoading(true);
    if (!user?.token) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(
        `${API_URL}/orders`,
        {
          items: items.map(i => ({ foodId: i.foodId, quantity: i.quantity, name: i.name, image: i.image })),
          paymentMethod: 'Cash On Pickup',
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      clearCart();
      addToast('Cash order placed! See you at pickup.', 'success');
      navigate(`/tracking/${res.data.order._id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to place order. Please try again.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10 animate-fadeIn">
      <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-8 text-sm">
        <ArrowLeft size={16} /> Back to Cart
      </button>

      <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight mb-2">Confirm Payment</h1>
      <p className="text-slate-400 text-sm mb-8">Review your order and complete payment below.</p>

      {/* Order Summary */}
      <div className="glass rounded-2xl border border-slate-800 p-5 mb-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Order Summary</h2>
        <div className="space-y-2.5">
          {items.map(item => (
            <div key={item.foodId} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-3">
                <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover bg-slate-900" />
                <span className="text-slate-300">{item.name} × {item.quantity}</span>
              </div>
              <span className="text-slate-200 font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 mt-4 pt-4 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>₹{amount.toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-400"><span>GST (5%)</span><span>₹{tax}</span></div>
          <div className="flex justify-between text-slate-100 font-bold text-sm pt-2 border-t border-slate-800 mt-2">
            <span>Total</span><span className="text-amber-400">₹{finalTotal}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      {paymentMethod === 'UPI' ? (
        <div className="glass rounded-2xl border border-purple-500/30 p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Smartphone size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Pay via UPI / Cards</h2>
              <p className="text-xs text-slate-400">GPay • PhonePe • Paytm • Any UPI • Cards</p>
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-5 flex items-center justify-between">
            <span className="text-slate-300 text-sm font-medium">Amount to Pay</span>
            <span className="text-2xl font-extrabold text-purple-300 flex items-center gap-1">
              <IndianRupee size={18} />{finalTotal}
            </span>
          </div>

          <div className="space-y-2 mb-5">
            {[
              'A secure payment popup will open',
              'Pay via any UPI app, card, or net banking',
              'Payment confirmation is instant and automatic',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
                <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-purple-400 font-bold text-[9px]">{i + 1}</span>
                </div>
                {step}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-5">
            <ShieldCheck size={12} className="text-green-400" />
            256-bit SSL encrypted · PCI-DSS compliant · Powered by Razorpay
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle size={14} />{error}
            </div>
          )}

          <button
            onClick={handleRazorpayPayment}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Preparing Payment...</>
            ) : (
              <>Pay ₹{finalTotal} Securely <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-green-500/30 p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <Banknote size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Cash on Pickup</h2>
              <p className="text-xs text-slate-400">Pay in cash when you collect your order</p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-5 flex items-center justify-between">
            <span className="text-slate-300 text-sm font-medium">Amount to Pay at Pickup</span>
            <span className="text-2xl font-extrabold text-green-300 flex items-center gap-1">
              <IndianRupee size={18} />{finalTotal}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-5">Please keep exact change ready. Your order will be confirmed immediately with a pickup token.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle size={14} />{error}
            </div>
          )}

          <button
            onClick={handleCashOrder}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Placing Order...</> : <>Confirm Cash Order <ChevronRight size={16} /></>}
          </button>
        </div>
      )}

      <p className="text-center text-[10px] text-slate-600">By proceeding you agree to the Campus Canteen terms of service.</p>
    </div>
  );
};
