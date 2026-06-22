import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { CreditCard, ShieldCheck, Sparkles, ArrowLeft, QrCode } from 'lucide-react';
import axios from 'axios';

export const CheckoutPayment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { addToast } = useSocket();

  const [loading, setLoading] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const state = location.state as {
    paymentMethod: 'Razorpay UPI' | 'Card Payment';
    amount: number;
    items: Array<{ foodId: string; quantity: number }>;
  } | null;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // Redirect if direct page navigation without cart context
    if (!state || !state.items || state.items.length === 0) {
      navigate('/cart');
    }
  }, [state, navigate]);

  if (!state) return null;

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate gateway handshakes
    setTimeout(async () => {
      try {
        const mockTransactionId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();

        const orderPayload = {
          items: state.items.map(i => ({ foodId: i.foodId, quantity: i.quantity })),
          paymentMethod: state.paymentMethod,
          paymentDetails: {
            transactionId: mockTransactionId,
            status: 'Success'
          }
        };

        const res = await axios.post(`${API_URL}/orders`, orderPayload, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });

        addToast(
          'Payment Successful',
          `₹${state.amount} paid via ${state.paymentMethod}. Transaction: ${mockTransactionId}`,
          'success'
        );

        clearCart();
        navigate(`/tracking/${res.data.order._id}`);
      } catch (err: any) {
        console.error(err);
        addToast('Payment Failed', err.response?.data?.message || 'Processing error.', 'warning');
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <button
        onClick={() => navigate('/cart')}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-xs font-semibold"
      >
        <ArrowLeft size={14} /> Back to Cart
      </button>

      <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Checkout Form */}
        <div className="md:col-span-3 glass-premium rounded-3xl p-6 border border-slate-800 space-y-6">
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldCheck size={20} />
            <h2 className="text-base font-extrabold text-slate-100">Secure Mess Checkout</h2>
          </div>

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {state.paymentMethod === 'Razorpay UPI' ? (
              <div className="space-y-4">
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-850 flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-xl">
                    <QrCode size={120} className="text-slate-950" />
                  </div>
                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    Scan the QR code with any UPI app (GPay, PhonePe, Bhim) to pay ₹{state.amount + Number((state.amount * 0.05).toFixed(2))}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Or enter Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    required
                    placeholder="student@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  />
                  <p className="text-[9px] text-slate-500">Format: username@bankname</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Rohan Sharma"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Card Number</label>
                  <div className="relative">
                    <CreditCard size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="4321 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 pl-9 pr-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="12/28"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">CVV</label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      placeholder="•••"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 text-xs mt-6"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  Validating payment source...
                </>
              ) : (
                `Pay ₹${state.amount + Number((state.amount * 0.05).toFixed(2))}`
              )}
            </button>
          </form>
        </div>

        {/* Amount Summary */}
        <div className="md:col-span-2 space-y-4">
          <div className="glass rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" /> Invoice Summary
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Items Subtotal</span>
                <span>₹{state.amount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (5%)</span>
                <span>₹{Number((state.amount * 0.05).toFixed(2))}</span>
              </div>
              <div className="border-t border-slate-800/80 my-2 pt-2 flex justify-between font-bold text-slate-100">
                <span>Total Payable</span>
                <span className="text-amber-500">₹{state.amount + Number((state.amount * 0.05).toFixed(2))}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 text-center border-t border-slate-800/80 pt-3 leading-relaxed">
              This is a secure mock integration. Funds will not be debited from any real account.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
