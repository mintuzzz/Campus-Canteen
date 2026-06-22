import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Trash2, ShoppingBag, ArrowRight, ShieldAlert, CreditCard, Banknote } from 'lucide-react';
import axios from 'axios';

export const Cart: React.FC = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();
  const { user } = useAuth();
  const { addToast } = useSocket();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<'Cash On Pickup' | 'Razorpay UPI' | 'Card Payment'>('Cash On Pickup');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    if (paymentMethod !== 'Cash On Pickup') {
      // Navigate to online mock checkout page, pass total and method in state
      navigate('/checkout-payment', { 
        state: { 
          paymentMethod,
          amount: cartTotal,
          items: cartItems.map(i => ({ foodId: i.foodId, quantity: i.quantity, price: i.price, name: i.name, image: i.image }))
        } 
      });
      return;
    }

    // Cash On Pickup -> Place order directly on the backend
    setLoading(true);
    try {
      const orderPayload = {
        items: cartItems.map((item) => ({
          foodId: item.foodId,
          quantity: item.quantity,
        })),
        paymentMethod: 'Cash On Pickup',
      };

      const res = await axios.post(`${API_URL}/orders`, orderPayload, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      addToast(
        'Order Placed Successfully', 
        `Token: ${res.data.order.tokenNumber}. Pay at counter upon pickup.`, 
        'success'
      );
      
      clearCart();
      navigate(`/tracking/${res.data.order._id}`);
    } catch (err: any) {
      console.error(err);
      addToast('Order Error', err.response?.data?.message || 'Failed to submit order.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="bg-slate-800/40 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
          <ShoppingBag size={24} className="text-slate-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-200">Your Cart is Empty</h2>
        <p className="text-slate-400 text-xs mt-2 mb-8 leading-relaxed">Browse the mess and canteen menus to select food items before checking out.</p>
        <Link to="/menu" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/10">Browse Foods</Link>
      </div>
    );
  }

  const tax = Number((cartTotal * 0.05).toFixed(2)); // 5% CGST/SGST
  const finalTotal = cartTotal + tax;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-semibold">{cartItems.length} Food Dishes</span>
            <button
              onClick={clearCart}
              className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} /> Clear all
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {cartItems.map((item) => (
              <div
                key={item.foodId}
                className="glass rounded-2xl p-4.5 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex gap-4 items-center">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 rounded-lg object-cover bg-slate-950 shrink-0"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{item.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Price: ₹{item.price}</p>
                  </div>
                </div>

                {/* Adjuster */}
                <div className="flex justify-between sm:justify-end items-center gap-6 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-2.5 py-1">
                    <button
                      onClick={() => updateQuantity(item.foodId, item.quantity - 1)}
                      className="text-slate-400 hover:text-white px-2 py-0.5 font-extrabold text-sm"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-slate-200 w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.foodId, item.quantity + 1)}
                      className="text-slate-400 hover:text-white px-2 py-0.5 font-extrabold text-sm"
                    >
                      +
                    </button>
                  </div>

                  <span className="text-xs font-bold text-slate-200 w-16 text-right">
                    ₹{item.price * item.quantity}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.foodId)}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800/40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Payment Methods & Order Summary */}
        <div className="space-y-6">
          {/* Payment Method Selector */}
          <div className="glass rounded-2xl p-5 border border-slate-800">
            <h2 className="text-xs font-extrabold text-slate-200 mb-4">Select Payment Method</h2>
            
            <div className="flex flex-col gap-3">
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'Cash On Pickup'
                    ? 'bg-amber-500/10 border-amber-500 text-slate-100'
                    : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Banknote size={16} className={paymentMethod === 'Cash On Pickup' ? 'text-amber-500' : ''} />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Cash On Pickup</p>
                    <p className="text-[9px] text-slate-500">Pay at the counter in cash</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'Cash On Pickup'}
                  onChange={() => setPaymentMethod('Cash On Pickup')}
                  className="hidden"
                />
              </label>

              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'Razorpay UPI'
                    ? 'bg-amber-500/10 border-amber-500 text-slate-100'
                    : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className={paymentMethod === 'Razorpay UPI' ? 'text-amber-500' : ''} />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Razorpay UPI</p>
                    <p className="text-[9px] text-slate-500">GPay, PhonePe, Paytm, or UPI ID</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'Razorpay UPI'}
                  onChange={() => setPaymentMethod('Razorpay UPI')}
                  className="hidden"
                />
              </label>

              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'Card Payment'
                    ? 'bg-amber-500/10 border-amber-500 text-slate-100'
                    : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className={paymentMethod === 'Card Payment' ? 'text-amber-500' : ''} />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Credit/Debit Card</p>
                    <p className="text-[9px] text-slate-500">Visa, Mastercard, RuPay cards</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'Card Payment'}
                  onChange={() => setPaymentMethod('Card Payment')}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Pricing Details */}
          <div className="glass rounded-2xl p-5 border border-slate-800 space-y-4">
            <h2 className="text-xs font-extrabold text-slate-200 border-b border-slate-800 pb-2">Order Summary</h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (5%)</span>
                <span>₹{tax}</span>
              </div>
              <div className="border-t border-slate-800/80 my-2 pt-2 flex justify-between font-bold text-slate-100">
                <span>Total Amount</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 text-xs mt-6"
            >
              {loading ? 'Submitting Order...' : paymentMethod === 'Cash On Pickup' ? 'Place Order' : 'Proceed to Payment'}
              {!loading && <ArrowRight size={14} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
