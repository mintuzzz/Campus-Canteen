import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { Search, RotateCcw, MessageSquare, ChevronRight, ShoppingBag, Eye } from 'lucide-react';
import axios from 'axios';

interface Order {
  _id: string;
  items: Array<{
    foodId: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  tokenNumber: string;
  createdAt: string;
}

export const OrderHistory: React.FC = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { addToast } = useSocket();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/orders/myorders`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching order history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
      addToCart({
        foodId: item.foodId,
        name: item.name,
        image: item.image,
        price: item.price,
      }, item.quantity);
    });
    addToast('Reordered Items', 'Items from your past order added to the cart.', 'success');
    navigate('/cart');
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.tokenNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((item) => item.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight mb-8">Your Order History</h1>

      {/* Query Filters */}
      <div className="glass rounded-3xl p-5 mb-8 border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by token or food name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {['All', 'Completed', 'Preparing', 'Ready', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs font-bold px-4 py-2 rounded-full shrink-0 border transition-all ${
                statusFilter === status
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="glass rounded-3xl h-24 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass rounded-3xl p-16 border border-slate-800 text-center">
          <p className="text-slate-500 text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order._id}
                className="glass rounded-3xl p-5 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-colors"
              >
                {/* Details left */}
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800 text-slate-400">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded font-mono font-bold">
                        {order.tokenNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 space-x-2">
                      <span>{dateStr} at {timeStr}</span>
                      <span>•</span>
                      <span>Total: ₹{order.totalAmount}</span>
                      <span>•</span>
                      <span>Method: {order.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Controls right */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    order.status === 'Completed'
                      ? 'bg-slate-800 text-slate-400'
                      : order.status === 'Cancelled'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {order.status}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/tracking/${order._id}`}
                      className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold p-2 rounded-xl border border-slate-800 hover:text-white transition-colors"
                      title="View Details / Invoice"
                    >
                      <Eye size={14} />
                    </Link>

                    {order.status === 'Completed' && (
                      <Link
                        to={`/feedback/${order._id}`}
                        className="bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 hover:border-transparent text-amber-500 hover:text-slate-950 font-bold px-3 py-2 rounded-xl text-[10px] flex items-center gap-1 transition-all"
                      >
                        <MessageSquare size={12} /> Feedback
                      </Link>
                    )}

                    <button
                      onClick={() => handleReorder(order)}
                      className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold px-3 py-2 rounded-xl border border-slate-800 text-[10px] flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={12} /> Reorder
                    </button>
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
