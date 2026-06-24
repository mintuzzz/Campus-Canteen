import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { 
  ShoppingBag, Clock, Sparkles, MessageSquare, DollarSign, Star,
  CheckCircle, ArrowUpRight, Shield, BellRing, RefreshCw, QrCode
} from 'lucide-react';
import axios from 'axios';

interface OrderItem {
  _id: string;
  userId: { name: string; studentId: string };
  items: Array<{ name: string; quantity: number }>;
  totalAmount: number;
  status: string;
  tokenNumber: string;
  createdAt: string;
}

interface SummaryData {
  date: string;
  summary: string;
  recommendations: string;
  metadata: {
    ordersToday: number;
    revenue: number;
    mostPopular: string;
    leastPopular: string;
    complaintPercentage: number;
    averageRating: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, addToast } = useSocket();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageRating: 0,
    totalFeedback: 0,
  });

  const [liveOrders, setLiveOrders] = useState<OrderItem[]>([]);
  const [aiSummary, setAiSummary] = useState<SummaryData | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Analytics Overview
      const analyticsRes = await axios.get(`${API_URL}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const metrics = analyticsRes.data.metrics;
      
      setStats({
        totalOrders: metrics.totalOrders,
        revenue: metrics.totalRevenue,
        pendingOrders: metrics.pendingOrders,
        completedOrders: metrics.completedOrders,
        averageRating: metrics.averageRating,
        totalFeedback: metrics.totalFeedback,
      });

      // 2. Fetch Active live orders
      const ordersRes = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params: { status: 'Pending' }, // Fetch initial pending ones
      });
      setLiveOrders(ordersRes.data.slice(0, 5));

      // 3. Fetch today's AI Summary
      fetchSummary();

    } catch (error) {
      console.error('Error fetching admin dashboard details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!user) return;
    setGeneratingSummary(true);
    try {
      const summaryRes = await axios.get(`${API_URL}/summary/today`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setAiSummary(summaryRes.data);
    } catch (e) {
      console.error('Error loading AI Summary:', e);
    } finally {
      setGeneratingSummary(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Hook Live Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('newOrder', (newOrder: OrderItem) => {
      // Add to live orders list on screen
      setLiveOrders((prev) => [newOrder, ...prev.slice(0, 4)]);
      // Re-trigger stats calculation
      fetchDashboardData();
      addToast(
        'New Campus Order!',
        `Order ${newOrder.tokenNumber} submitted by ${newOrder.userId.name}.`,
        'info'
      );
    });

    socket.on('orderStatusChanged', () => {
      fetchDashboardData();
    });

    return () => {
      socket.off('newOrder');
      socket.off('orderStatusChanged');
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs">Connecting Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Shield className="text-red-500" /> Canteen Admin Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-1">Manage orders, verify payments, and read automated summaries</p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="glass rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div className="bg-red-500/10 p-2.5 rounded-xl text-red-500">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total Orders</p>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">{stats.totalOrders}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-500">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Revenue</p>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">₹{stats.revenue}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-500">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Pending</p>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">{stats.pendingOrders}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500">
            <CheckCircle size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Completed</p>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">{stats.completedOrders}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400">
            <Star size={18} className="fill-amber-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Avg Rating</p>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">{stats.averageRating}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-500">
            <MessageSquare size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Feedback</p>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">{stats.totalFeedback}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle: Live Order Stream & Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Order Queue */}
          <div className="glass rounded-3xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                <BellRing size={16} className="text-red-500 animate-pulse" /> Live Order Stream (Pending)
              </h2>
              <Link to="/admin/orders" className="text-xs text-red-400 hover:underline flex items-center gap-1">
                Fulfill Orders <ArrowUpRight size={14} />
              </Link>
            </div>

            {liveOrders.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500 text-xs">No pending orders. Waiting for new submissions...</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {liveOrders.map((order) => (
                  <div key={order._id} className="py-3.5 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          {order.tokenNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Student: {order.userId.name} ({order.userId.studentId})</p>
                    </div>
                    <span className="text-xs font-extrabold text-slate-300">₹{order.totalAmount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Access Menu Admin */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link to="/admin/orders" className="glass hover:border-red-500/30 p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-2 transition-all">
              <Clock size={20} className="text-red-500" />
              <span className="text-xs font-semibold text-slate-300">Live Orders</span>
            </Link>
            <Link to="/admin/menu" className="glass hover:border-red-500/30 p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-2 transition-all">
              <ShoppingBag size={20} className="text-red-500" />
              <span className="text-xs font-semibold text-slate-300">Edit Menu</span>
            </Link>
            <Link to="/admin/feedback" className="glass hover:border-red-500/30 p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-2 transition-all">
              <MessageSquare size={20} className="text-red-500" />
              <span className="text-xs font-semibold text-slate-300">Feedback</span>
            </Link>
            <Link to="/admin/analytics" className="glass hover:border-red-500/30 p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-2 transition-all">
              <Star size={20} className="text-red-500" />
              <span className="text-xs font-semibold text-slate-300">Analytics</span>
            </Link>
            <Link to="/admin/scan-qr" className="glass hover:border-emerald-500/30 p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-2 transition-all border border-slate-800">
              <QrCode size={20} className="text-emerald-500" />
              <span className="text-xs font-semibold text-slate-300">Scan QR</span>
            </Link>
          </div>
        </div>

        {/* Right Side: AI Daily Summary Panel */}
        <div className="space-y-6">
          <div className="glass-premium rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none" />
            <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500 fill-amber-500/20" /> AI Daily Summary
              </h2>
              <button
                onClick={fetchSummary}
                disabled={generatingSummary}
                className="text-slate-500 hover:text-white transition-colors"
                title="Regenerate Report"
              >
                <RefreshCw size={12} className={generatingSummary ? 'animate-spin' : ''} />
              </button>
            </div>

            {generatingSummary ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-[10px] text-slate-500">Aggregating mess logs...</p>
              </div>
            ) : aiSummary ? (
              <div className="space-y-4 text-xs">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Orders Today</span>
                    <p className="text-sm font-bold text-slate-300">{aiSummary.metadata.ordersToday}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Revenue</span>
                    <p className="text-sm font-bold text-slate-300">₹{aiSummary.metadata.revenue}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Most Popular</span>
                    <p className="text-[10px] font-bold text-slate-300 truncate" title={aiSummary.metadata.mostPopular}>
                      {aiSummary.metadata.mostPopular}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Least Popular</span>
                    <p className="text-[10px] font-bold text-slate-300 truncate" title={aiSummary.metadata.leastPopular}>
                      {aiSummary.metadata.leastPopular}
                    </p>
                  </div>
                </div>

                {/* Summary Text */}
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Analysis</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium bg-slate-950/20 p-3 rounded-xl border border-slate-900/50">
                    {aiSummary.summary}
                  </p>
                </div>

                {/* Suggestions */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions & Suggestions</h4>
                  <div className="flex flex-col gap-1.5 pl-1.5 text-[11px] text-slate-300 leading-relaxed font-semibold">
                    {aiSummary.recommendations.split('\n').map((rec, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-500 text-xs py-8">Summary unavailable for today.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
