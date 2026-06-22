import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, RefreshCw, BarChart3, Clock, Smile, Star } from 'lucide-react';
import axios from 'axios';

interface ChartData {
  ordersPerDay: Array<{ date: string; orders: number; revenue: number }>;
  ratingsDistribution: Array<{ rating: string; count: number }>;
  mostOrderedFoods: Array<{ name: string; quantity: number }>;
  leastLikedFoods: Array<{ name: string; rating: number }>;
  sentimentBreakdown: Array<{ name: string; value: number }>;
  peakOrderingHours: Array<{ hour: string; count: number }>;
}

interface AnalyticsStats {
  totalOrders: number;
  totalRevenue: number;
  totalFeedback: number;
  averageRating: number;
  complaintPercentage: number;
  mostLikedFood: string;
  leastLikedFood: string;
}

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setStats(res.data.metrics);
      setCharts(res.data.charts);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats || !charts) return null;

  // Sentiment colors
  const COLORS = ['#10b981', '#64748b', '#ef4444']; // Positive (emerald), Neutral (slate), Negative (red)
  const FOOD_COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Mess Analytics & Reports</h1>
          <p className="text-slate-400 text-xs mt-1">Visualize food rankings, dining feedback sentiments, and rush hour peaks</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-750 self-start sm:self-auto"
        >
          <RefreshCw size={13} /> Refresh Report
        </button>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-2xl p-5 border border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Most Ordered / Liked Dish</p>
          <h3 className="text-sm font-bold text-slate-200 mt-1 truncate" title={stats.mostLikedFood}>
            {stats.mostLikedFood}
          </h3>
          <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">Rating Avg: {stats.averageRating} ★</span>
        </div>

        <div className="glass rounded-2xl p-5 border border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Least Ordered / Liked Dish</p>
          <h3 className="text-sm font-bold text-slate-200 mt-1 truncate" title={stats.leastLikedFood}>
            {stats.leastLikedFood}
          </h3>
          <span className="text-[10px] text-red-400 font-semibold block mt-0.5">Recipe revision suggested</span>
        </div>

        <div className="glass rounded-2xl p-5 border border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Complaint Ratio</p>
          <h3 className="text-xl font-bold text-slate-100 mt-1">{stats.complaintPercentage}%</h3>
          <span className="text-[10px] text-slate-500 block mt-0.5">Feedbacks with written remarks</span>
        </div>

        <div className="glass rounded-2xl p-5 border border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Dining Logs</p>
          <h3 className="text-xl font-bold text-slate-100 mt-1">{stats.totalFeedback}</h3>
          <span className="text-[10px] text-slate-500 block mt-0.5">Out of {stats.totalOrders} total orders</span>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Orders and Revenue Line */}
        <div className="glass rounded-3xl p-5 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} className="text-red-500" /> Sales Trend (Last 7 Days)
          </h3>
          <div className="h-64 text-slate-400 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.ordersPerDay}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
                <Line type="monotone" dataKey="orders" name="Orders Count" stroke="#fbbf24" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Peak Hours Line */}
        <div className="glass rounded-3xl p-5 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="text-red-500" /> Peak Ordering Hours
          </h3>
          <div className="h-64 text-slate-400 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.peakOrderingHours}>
                <defs>
                  <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                <Area type="monotone" dataKey="count" name="Orders Count" stroke="#ef4444" fillOpacity={1} fill="url(#colorHour)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Most Ordered Items */}
        <div className="glass rounded-3xl p-5 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 size={14} className="text-red-500" /> Most Ordered Food Dishes
          </h3>
          <div className="h-64 text-slate-400 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.mostOrderedFoods} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="name" type="category" stroke="#64748b" width={110} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                <Bar dataKey="quantity" name="Quantity Sold" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {charts.mostOrderedFoods.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={FOOD_COLORS[index % FOOD_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Least Liked Food Items */}
        <div className="glass rounded-3xl p-5 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Star size={14} className="text-red-500" /> Least Liked Foods (Lowest Rated)
          </h3>
          <div className="h-64 text-slate-400 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.leastLikedFoods}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[0, 5]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                <Bar dataKey="rating" name="Rating Average" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Ratings Distribution */}
        <div className="glass rounded-3xl p-5 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Star size={14} className="text-red-500" /> Dining Ratings Distribution
          </h3>
          <div className="h-64 text-slate-400 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.ratingsDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="rating" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                <Bar dataKey="count" name="Reviews Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Feedback Sentiment */}
        <div className="glass rounded-3xl p-5 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Smile size={14} className="text-red-500" /> Sentiment Breakdown
          </h3>
          <div className="h-64 text-slate-400 text-xs flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.sentimentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {charts.sentimentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
