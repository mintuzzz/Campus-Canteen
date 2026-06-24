import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Search, RefreshCw, XCircle, Check, Loader, Gift, QrCode, AlertTriangle } from 'lucide-react';
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
    studentId: string;
    department: string;
    phone: string;
  };
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  tokenNumber: string;
  pickupTime: string;
  createdAt: string;
}

export const OrderManagement: React.FC = () => {
  const { user } = useAuth();
  const { socket, addToast } = useSocket();

  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Hook live updates
  useEffect(() => {
    if (!socket) return;

    socket.on('newOrder', (newOrder: OrderDetail) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('orderStatusChanged', (updatedOrder: OrderDetail) => {
      setOrders((prev) => 
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    });

    return () => {
      socket.off('newOrder');
      socket.off('orderStatusChanged');
    };
  }, [socket]);

  const handleStatusUpdate = async (id: string, nextStatus: string, token: string) => {
    if (!user) return;
    try {
      await axios.put(
        `${API_URL}/orders/${id}/status`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      addToast(
        'Order Updated', 
        `Token ${token} transitioned to status: ${nextStatus}`, 
        'success'
      );
    } catch (err) {
      console.error(err);
      addToast('Status Error', 'Failed to update status.', 'warning');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.tokenNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.userId.name.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((item) => item.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Live Order Fulfillment Queue</h1>
          <p className="text-slate-400 text-xs mt-1">Accept, prepare and complete campus orders in real-time</p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-750 self-start sm:self-auto"
        >
          <RefreshCw size={13} /> Refresh List
        </button>
      </div>

      {/* Query Filters */}
      <div className="glass rounded-3xl p-5 mb-8 border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by token, student or food..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 focus:border-red-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {['All', 'Pending Payment', 'Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs font-bold px-4 py-2 rounded-full shrink-0 border transition-all ${
                statusFilter === status
                  ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/10'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-750 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="glass rounded-3xl h-24 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass rounded-3xl p-16 border border-slate-800 text-center">
          <p className="text-slate-500 text-xs">No active orders matching the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div
                key={order._id}
                className="glass rounded-3xl p-5 border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:border-slate-700/80 transition-colors"
              >
                {/* Details left */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-0.5 rounded font-mono font-bold">
                      {order.tokenNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] text-slate-400">
                    <div>
                      <p className="text-slate-500 font-bold uppercase">Student</p>
                      <p className="text-slate-300 font-semibold mt-0.5">{order.userId.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase">ID / Dept</p>
                      <p className="text-slate-300 font-semibold mt-0.5">{order.userId.studentId} | {order.userId.department}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase">Order Time</p>
                      <p className="text-slate-300 font-semibold mt-0.5">{timeStr} ({new Date(order.createdAt).toLocaleDateString()})</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase">Payment Status</p>
                      <p className="text-slate-300 font-semibold mt-0.5">{order.paymentStatus} ({order.paymentMethod})</p>
                    </div>
                  </div>
                </div>

                {/* Amount / Status indicators right */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 w-full lg:w-auto border-t lg:border-t-0 border-slate-800/80 pt-4 lg:pt-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Amount</span>
                    <span className="text-sm font-extrabold text-slate-100">₹{order.totalAmount}</span>
                  </div>

                  {/* Operational controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(order.status === 'Pending' || order.status === 'Paid') && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'Accepted', order.tokenNumber)}
                          className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 font-bold px-3 py-2 rounded-xl text-[10px] border border-emerald-500/20 hover:border-transparent flex items-center gap-1 transition-all"
                        >
                          <Check size={12} /> Accept
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'Cancelled', order.tokenNumber)}
                          className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold px-3 py-2 rounded-xl text-[10px] border border-red-500/20 hover:border-transparent flex items-center gap-1 transition-all"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}

                    {order.status === 'Accepted' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'Preparing', order.tokenNumber)}
                          className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 font-bold px-3 py-2 rounded-xl text-[10px] border border-amber-500/20 hover:border-transparent flex items-center gap-1 transition-all"
                        >
                          <Loader size={12} className="animate-spin" /> Prepare
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'Cancelled', order.tokenNumber)}
                          className="text-red-400 hover:underline text-[10px] px-2"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {order.status === 'Preparing' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'Ready', order.tokenNumber)}
                        className="bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-slate-950 font-bold px-4 py-2 rounded-xl text-[10px] border border-blue-500/20 hover:border-transparent flex items-center gap-1 transition-all animate-pulse"
                      >
                        <Gift size={12} /> Mark Ready
                      </button>
                    )}

                    {order.status === 'Ready' && (
                      <Link
                        to={`/admin/scan-qr?token=${order.tokenNumber}`}
                        className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 font-bold px-4 py-2 rounded-xl text-[10px] border border-emerald-500/20 hover:border-transparent flex items-center gap-1.5 transition-all"
                      >
                        <QrCode size={12} /> Scan QR Pickup
                      </Link>
                    )}

                    {order.status === 'Pending Payment' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        <AlertTriangle size={10} /> Awaiting Payment
                      </span>
                    )}

                    {['Completed', 'Cancelled'].includes(order.status) && (
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                        order.status === 'Completed' ? 'bg-slate-800 text-slate-400' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {order.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
