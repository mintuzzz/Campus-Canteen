import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Clock, ShieldCheck, Printer, ArrowLeft, Heart, ChevronRight, KeyRound, Copy, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface OrderItem {
  foodId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderDetail {
  _id: string;
  userId: {
    name: string;
    email: string;
    phone: string;
    studentId: string;
    department: string;
  };
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  tokenNumber: string;
  token?: string;
  pickupToken?: string;
  razorpayPaymentId?: string;
  pickupTime: string;
  createdAt: string;
}

export const OrderTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, addToast } = useSocket();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchOrderDetails = async () => {
    if (!id || !user) return;
    try {
      const res = await axios.get(`${API_URL}/orders/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setOrder(res.data);
    } catch (err) {
      console.error('Error fetching tracking order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id, user]);

  // Handle Socket Status Shifts
  useEffect(() => {
    if (!socket || !id) return;
    
    const handleStatusUpdate = (updatedOrder: OrderDetail) => {
      if (updatedOrder._id === id) {
        setOrder(updatedOrder);
        addToast(
          'Order Status Shifted',
          `Order ${updatedOrder.token || updatedOrder.tokenNumber} is now: ${updatedOrder.status}`,
          updatedOrder.status === 'Ready' ? 'warning' : 'info'
        );
      }
    };

    socket.on('orderStatusChanged', handleStatusUpdate);

    return () => {
      socket.off('orderStatusChanged', handleStatusUpdate);
    };
  }, [socket, id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 text-xs">Tracking details not available.</p>
        <Link to="/" className="text-amber-500 hover:underline mt-4 block text-xs">Back to Dashboard</Link>
      </div>
    );
  }

  // Stepper Configurations
  const isCashOrder = order.paymentMethod === 'Cash On Pickup';
  const stages = isCashOrder
    ? ['Placed', 'Accepted', 'Preparing', 'Ready', 'Completed']
    : ['Paid', 'Preparing', 'Ready', 'Completed'];

  let currentStageIndex: number;

  if (isCashOrder) {
    if (order.status === 'Pending') currentStageIndex = 0;
    else if (order.status === 'Accepted') currentStageIndex = 1;
    else if (order.status === 'Preparing') currentStageIndex = 2;
    else if (order.status === 'Ready') currentStageIndex = 3;
    else if (order.status === 'Completed') currentStageIndex = 4;
    else currentStageIndex = -1;
  } else {
    currentStageIndex = stages.indexOf(order.status);
    if (order.status === 'Pending Payment' || order.status === 'Cancelled' || order.status === 'Refunded') {
      currentStageIndex = -1;
    }
  }

  const tax = Number((order.totalAmount * 0.05).toFixed(2));
  const finalTotal = order.totalAmount + tax;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn print:bg-white print:text-black">
      {/* Hide on print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Dashboard
        </button>

        <button
          onClick={handlePrint}
          className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-750 transition-colors"
        >
          <Printer size={13} /> Print Invoice
        </button>
      </div>

      {/* Stepper Card */}
      <div className="glass-premium rounded-3xl p-6 md:p-8 mb-8 border border-slate-800 print:hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Status Tracking</span>
            <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2 mt-0.5">
              Token: <span className="text-amber-500 font-mono">{order.token || order.tokenNumber}</span>
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimated pickup</span>
            <p className="text-xs font-bold text-slate-200 mt-0.5">{order.pickupTime || 'Preparing'}</p>
          </div>
        </div>

        {/* Stepper Line */}
        {['Cancelled', 'Refunded'].includes(order.status) ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-center text-xs font-semibold">
            This order has been cancelled/refunded. If payment was processed online, a refund is underway.
          </div>
        ) : order.status === 'Pending Payment' ? (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl p-4 text-center text-xs font-semibold animate-pulse">
            Unfinished checkout. Awaiting payment confirmation...
          </div>
        ) : order.status === 'Awaiting Verification' ? (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl p-5 text-center text-xs space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400">Awaiting Canteen Approval</span>
            <p className="text-slate-400 text-[11px] leading-relaxed max-w-xl mx-auto">
              Your UPI receipt (ID: <strong className="text-slate-200 font-mono">{order.transactionId}</strong>) has been uploaded. Canteen staff is auditing the transaction. Food preparation will begin immediately upon approval.
            </p>
          </div>
        ) : (
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 mt-8 md:px-4">
            {/* Background line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 hidden md:block z-0" />
            
            {/* Active coloring line */}
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-amber-500 -translate-y-1/2 hidden md:block z-0 transition-all duration-500" 
              style={{ width: `${(Math.max(0, currentStageIndex) / (stages.length - 1)) * 100}%` }}
            />

            {stages.map((stage, idx) => {
              const isCompleted = idx <= currentStageIndex;
              const isActive = idx === currentStageIndex;
              return (
                <div key={stage} className="flex md:flex-col items-center gap-3 md:gap-2.5 relative z-10 w-full md:w-auto">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20 scale-110'
                        : isCompleted
                        ? 'bg-slate-900 text-amber-500 border-amber-500'
                        : 'bg-slate-950 text-slate-600 border-slate-800'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`text-xs font-semibold ${isActive ? 'text-amber-500' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pickup Token Card — replaces old QR code */}
      {order.status !== 'Cancelled' && order.status !== 'Refunded' && order.status !== 'Pending Payment' && (
        <div className="glass-premium rounded-3xl p-6 mb-8 border border-amber-500/20 relative overflow-hidden print:hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-full inline-block">
                🎫 Pickup Token
              </span>
              <h2 className="text-xl font-extrabold text-slate-100">
                Your Token Number:
              </h2>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {order.status === 'Completed'
                  ? '✅ This token has been verified and your order is complete!'
                  : order.status === 'Ready'
                  ? '🔔 Your food is ready! Walk to the counter and tell your token.'
                  : 'When your order is ready, tell this token to the canteen staff at the counter to collect your food.'}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  order.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  order.status === 'Ready' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  Status: {order.status}
                </span>
                {order.razorpayPaymentId && (
                  <span className="text-[9px] text-slate-500 font-mono">TxID: {order.razorpayPaymentId}</span>
                )}
              </div>
            </div>

            {/* Token display */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className={`bg-slate-950 border-2 rounded-3xl px-8 py-6 flex flex-col items-center gap-2 shadow-xl ${
                order.status === 'Completed' ? 'border-emerald-500/40 opacity-60' :
                order.status === 'Ready' ? 'border-amber-500 shadow-amber-500/20 animate-pulse' :
                'border-amber-500/30'
              }`}>
                <KeyRound size={20} className="text-amber-500" />
                <span className="text-2xl font-black font-mono text-amber-400 tracking-widest">
                  {order.pickupToken || order.token || order.tokenNumber}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 text-center max-w-[160px] leading-relaxed">
                {order.status === 'Completed' ? 'Token used ✓' : 'Tell this number at the counter'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Layout (Printed Area) */}
      <div id="invoice-sheet" className="glass rounded-3xl p-6 md:p-8 border border-slate-800 print:border-none print:shadow-none print:glass-none print:p-0">
        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-5 mb-5 print:text-black">
          <div>
            <h3 className="font-extrabold text-base tracking-tight print:text-black">CampusCanteen Receipt</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Order ID: {order._id.toUpperCase()}</p>
            <p className="text-[10px] text-slate-500">Date: {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold uppercase print:border-black print:text-black">
              {order.paymentStatus}
            </span>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">{order.paymentMethod}</p>
          </div>
        </div>

        {/* Student Details */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-6 text-slate-300 print:text-black">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase">Customer Details</p>
            <p className="font-bold text-slate-200 mt-1 print:text-black">{order.userId.name}</p>
            <p className="text-slate-400 text-[11px] print:text-black">{order.userId.email} | {order.userId.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[10px] font-bold uppercase">Campus Identifications</p>
            <p className="font-bold text-slate-200 mt-1 print:text-black">{order.userId.department}</p>
            <p className="text-slate-400 text-[11px] print:text-black">Roll No: {order.userId.studentId}</p>
          </div>
        </div>

        {/* Item Rows */}
        <div className="space-y-3.5 mb-6">
          <p className="text-slate-500 text-[10px] font-bold uppercase border-b border-slate-800 pb-2">Line Items</p>
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium print:text-black">
                {item.name} <span className="text-slate-500 text-[11px] font-bold print:text-black">x{item.quantity}</span>
              </span>
              <span className="font-bold text-slate-200 print:text-black">₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-slate-800 pt-4 text-xs space-y-2 text-slate-300 print:text-black">
          <div className="flex justify-between text-[11px]">
            <span>Items Subtotal</span>
            <span>₹{order.totalAmount}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>GST (5%)</span>
            <span>₹{tax}</span>
          </div>
          <div className="border-t border-slate-800/80 pt-2.5 flex justify-between font-extrabold text-sm text-slate-100 print:text-black">
            <span>{isCashOrder && order.paymentStatus === 'Pending' ? 'Amount to Pay (Cash)' : 'Amount Paid'}</span>
            <span className="text-amber-500 print:text-black">₹{finalTotal}</span>
          </div>
        </div>

        {/* Order Completion Buttons */}
        {order.status === 'Completed' && (
          <div className="border-t border-slate-850 mt-6 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
            <p className="text-[11px] text-slate-400 text-center sm:text-left leading-normal">
              Order complete! How did you like the food? Please submit a dining feedback.
            </p>
            <Link 
              to={`/feedback/${order._id}`}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-amber-500/10 transition-transform active:scale-95"
            >
              Give Feedback <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
