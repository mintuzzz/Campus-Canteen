import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { 
  ShoppingBag, Clock, Heart, MessageSquare, 
  ArrowRight, FileText, ChevronRight, HelpCircle
} from 'lucide-react';
import axios from 'axios';

interface OrderItem {
  _id: string;
  items: Array<{ name: string; quantity: number }>;
  totalAmount: number;
  status: string;
  tokenNumber: string;
  pickupTime: string;
  createdAt: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { socket, addToast } = useSocket();
  const navigate = useNavigate();

  const [ordersToday, setOrdersToday] = useState<number>(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Student Orders
      const ordersRes = await axios.get(`${API_URL}/orders/myorders`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const orders: OrderItem[] = ordersRes.data;
      setRecentOrders(orders.slice(0, 3));

      // Calculate stats
      const todayStr = new Date().toDateString();
      const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
      setOrdersToday(todayOrders.length);

      const pending = orders.filter((o) => 
        ['Pending', 'Accepted', 'Preparing', 'Ready'].includes(o.status)
      );
      setPendingOrdersCount(pending.length);

      // 2. Fetch Feedback Stats
      let feedbackCountVal = 0;
      // We will count how many of completed orders have feedbacks
      const completedOrders = orders.filter((o) => o.status === 'Completed');
      for (const order of completedOrders) {
        try {
          const fbRes = await axios.get(`${API_URL}/feedback/order/${order._id}`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          if (fbRes.data) feedbackCountVal++;
        } catch (e) {
          // No feedback yet
        }
      }
      setFeedbackCount(feedbackCountVal);

      // 3. Load Favorites from localStorage
      const favsStr = localStorage.getItem('canteen_favorites');
      const favIds = favsStr ? JSON.parse(favsStr) : [];
      setFavoritesCount(favIds.length);

      // Fetch food details for favorites
      if (favIds.length > 0) {
        const menuRes = await axios.get(`${API_URL}/menu`);
        const filteredFavs = menuRes.data.filter((item: any) => favIds.includes(item._id));
        setFavoriteItems(filteredFavs);
      }

    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Hook live order changes
  useEffect(() => {
    if (!socket) return;
    socket.on('orderStatusChanged', (updatedOrder: any) => {
      // Refetch stats and history
      fetchData();
      addToast(
        `Order Update (Token: ${updatedOrder.tokenNumber})`,
        `Your order status is now: ${updatedOrder.status}`,
        updatedOrder.status === 'Ready' ? 'warning' : 'info'
      );
    });
    return () => {
      socket.off('orderStatusChanged');
    };
  }, [socket]);

  const handleQuickReorder = (item: any) => {
    addToCart({
      foodId: item._id || item.foodId,
      name: item.name,
      image: item.image,
      price: item.price
    }, 1);
    addToast('Added to Cart', `${item.name} has been added.`, 'info');
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs">Assembling your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="glass-premium rounded-3xl p-6 md:p-8 mb-8 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-80 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            Welcome back, <span className="text-amber-500 capitalize">{user?.name}</span>!
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">Department: {user?.department || 'N/A'} | Roll Number: {user?.studentId || 'N/A'}</p>
        </div>
        <Link 
          to="/menu"
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98]"
        >
          Order Fresh Food Now <ArrowRight size={14} />
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
            <ShoppingBag size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Orders Today</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{ordersToday}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Orders</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{pendingOrdersCount}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
            <Heart size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Favorites</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{favoritesCount}</h3>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
            <MessageSquare size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Feedbacks</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{feedbackCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Orders & Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle: Live Order Tracking and Recents */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Orders Trackers */}
          <div>
            <h2 className="text-base font-extrabold text-slate-200 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" /> Active Order Tracking
            </h2>
            
            {recentOrders.filter(o => ['Pending', 'Accepted', 'Preparing', 'Ready'].includes(o.status)).length === 0 ? (
              <div className="glass rounded-2xl p-6 border border-slate-800 text-center">
                <p className="text-slate-500 text-xs leading-relaxed">No orders are currently in preparation. Hungry? Check the hot menu items today!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {recentOrders.filter(o => ['Pending', 'Accepted', 'Preparing', 'Ready'].includes(o.status)).map((order) => (
                  <div key={order._id} className="glass rounded-2xl p-5 border border-slate-800 flex justify-between items-center hover:border-slate-700 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">
                          {order.tokenNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Est. Pickup: {order.pickupTime || '20 Mins'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        order.status === 'Ready' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {order.status}
                      </span>
                      <Link to={`/tracking/${order._id}`} className="text-slate-400 hover:text-slate-200 transition-colors">
                        <ChevronRight size={18} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders History */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-extrabold text-slate-200">Recent Completed Orders</h2>
              <Link to="/history" className="text-xs text-amber-500 hover:underline flex items-center gap-1">
                All Orders <ChevronRight size={14} />
              </Link>
            </div>

            {recentOrders.filter(o => ['Completed', 'Cancelled'].includes(o.status)).length === 0 ? (
              <div className="glass rounded-2xl p-6 border border-slate-800 text-center">
                <p className="text-slate-500 text-xs">You have no order history yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentOrders.filter(o => ['Completed', 'Cancelled'].includes(o.status)).map((order) => (
                  <div key={order._id} className="glass rounded-2xl p-4.5 border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                          {order.tokenNumber}
                        </span>
                        <span className="text-xs text-slate-300 font-semibold truncate max-w-xs">
                          {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {new Date(order.createdAt).toLocaleDateString()} | Total: ₹{order.totalAmount}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold ${order.status === 'Completed' ? 'text-slate-400' : 'text-red-400'}`}>
                        {order.status}
                      </span>
                      {order.status === 'Completed' && (
                        <Link 
                          to={`/feedback/${order._id}`} 
                          className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[10px] border border-amber-500/20 hover:border-transparent transition-all"
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Actions & Favorite Foods */}
        <div className="space-y-6">
          {/* Quick Actions List */}
          <div className="glass rounded-2xl p-5 border border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-200 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link 
                to="/menu" 
                className="bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 group transition-all"
              >
                <ShoppingBag size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-200">Order Food</span>
              </Link>
              <Link 
                to="/menu" 
                className="bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 group transition-all"
              >
                <FileText size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-200">View Menu</span>
              </Link>
              <Link 
                to="/history" 
                className="bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 group transition-all"
              >
                <MessageSquare size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-200">Give Feedback</span>
              </Link>
              <Link 
                to="/history" 
                className="bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 group transition-all"
              >
                <Clock size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-200">Order History</span>
              </Link>
            </div>
          </div>

          {/* Favorite foods quick list */}
          <div className="glass rounded-2xl p-5 border border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-200 mb-4 flex items-center gap-2">
              <Heart size={16} className="text-amber-500 fill-amber-500/20" /> Your Favorite Dishes
            </h2>

            {favoriteItems.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 leading-relaxed">
                No favorites selected. Add dishes to favorites from the Daily Menu details page!
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {favoriteItems.slice(0, 4).map((item) => (
                  <div key={item._id} className="flex items-center gap-3 bg-slate-950/20 p-2.5 rounded-xl border border-slate-800/50">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-11 h-11 rounded-lg object-cover bg-slate-800 shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{item.name}</h4>
                      <p className="text-[10px] text-slate-500">₹{item.price} | {item.category}</p>
                    </div>
                    <button 
                      onClick={() => handleQuickReorder(item)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-[9px]"
                    >
                      Reorder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
