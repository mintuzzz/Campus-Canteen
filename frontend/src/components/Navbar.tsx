import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { ShoppingCart, Bell, LogOut, Menu, X, Coffee, Shield, CheckCheck } from 'lucide-react';
import axios from 'axios';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Listen for socket events to push notification onto local list
  useEffect(() => {
    if (!socket) return;
    socket.on('newNotification', (newNotif: NotificationItem) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });
    return () => {
      socket.off('newNotification');
    };
  }, [socket]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setNotifDropdownOpen(false);
    navigate(user?.role === 'admin' ? '/admin/login' : '/login');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <nav className="glass sticky top-0 z-40 w-full border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/'} className="flex items-center gap-2 group">
              <div className="bg-gradient-to-tr from-amber-500 to-amber-600 p-2 rounded-xl text-slate-900 group-hover:scale-105 transition-transform duration-200 shadow-lg shadow-amber-500/20">
                <Coffee size={20} className="stroke-[2.5]" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                Campus<span className="text-amber-500 font-extrabold">Canteen</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {user?.role === 'student' && (
              <>
                <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>Dashboard</Link>
                <Link to="/menu" className={`text-sm font-medium transition-colors ${location.pathname === '/menu' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>Order Food</Link>
                <Link to="/history" className={`text-sm font-medium transition-colors ${location.pathname === '/history' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>Order History</Link>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <Link to="/admin/dashboard" className={`text-sm font-medium flex items-center gap-1.5 transition-colors ${location.pathname === '/admin/dashboard' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>
                  <Shield size={14} className="text-amber-500" /> Admin Panel
                </Link>
                <Link to="/admin/orders" className={`text-sm font-medium transition-colors ${location.pathname === '/admin/orders' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>Live Orders</Link>
                <Link to="/admin/menu" className={`text-sm font-medium transition-colors ${location.pathname === '/admin/menu' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>Menu Management</Link>
                <Link to="/admin/payments" className={`text-sm font-medium transition-colors ${location.pathname === '/admin/payments' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>Payments</Link>
                <Link to="/admin/feedback" className={`text-sm font-medium transition-colors ${location.pathname === '/admin/feedback' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>Feedback Logs</Link>
                <Link to="/admin/analytics" className={`text-sm font-medium transition-colors ${location.pathname === '/admin/analytics' ? 'text-amber-500' : 'text-slate-300 hover:text-white'}`}>Analytics</Link>
              </>
            )}
          </div>

          {/* Action Utilities */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {/* Student specific Cart Icon */}
                {user.role === 'student' && (
                  <Link to="/cart" className="relative p-2 text-slate-300 hover:text-amber-500 transition-colors">
                    <ShoppingCart size={20} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      setNotifDropdownOpen(!notifDropdownOpen);
                      if (!notifDropdownOpen) fetchNotifications();
                    }}
                    className="relative p-2 text-slate-300 hover:text-amber-500 transition-colors"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-slate-100 font-extrabold text-[8px] w-4.5 h-4.5 flex items-center justify-center rounded-full border border-slate-900">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown list */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-80 glass-premium rounded-2xl shadow-2xl py-3 border border-slate-800 animate-fadeIn z-50">
                      <div className="flex justify-between items-center px-4 pb-2 border-b border-slate-800">
                        <span className="font-semibold text-xs text-slate-200">Alerts & Statuses</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[10px] text-amber-500 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <CheckCheck size={12} /> Clear all
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto mt-2">
                        {notifications.length === 0 ? (
                          <p className="text-center text-slate-500 text-xs py-8">No notifications yet.</p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n._id}
                              onClick={() => markAsRead(n._id)}
                              className={`px-4 py-3 border-b border-slate-900 cursor-pointer transition-colors flex flex-col gap-1 ${
                                !n.isRead ? 'bg-slate-800/40 hover:bg-slate-800/60' : 'hover:bg-slate-800/20'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className={`text-xs font-semibold ${!n.isRead ? 'text-amber-500' : 'text-slate-300'}`}>
                                  {n.title}
                                </span>
                                <span className="text-[9px] text-slate-500 shrink-0">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-snug">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Display / LogOut */}
                <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                    <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">Sign In</Link>
                <Link to="/register" className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl shadow-lg shadow-amber-500/15 transition-all">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger trigger */}
          <div className="md:hidden flex items-center gap-3">
            {user?.role === 'student' && (
              <Link to="/cart" className="relative p-2 text-slate-300 hover:text-amber-500">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-500 text-slate-950 font-bold text-[8px] w-4 h-4 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-slate-800 animate-fadeIn py-3">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3 flex flex-col gap-2">
            {user ? (
              <>
                <div className="px-3 py-2 border-b border-slate-800 mb-2">
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm font-bold text-slate-200">{user.name}</p>
                </div>

                {user.role === 'student' && (
                  <>
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500">Dashboard</Link>
                    <Link to="/menu" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500">Order Food</Link>
                    <Link to="/history" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500">Order History</Link>
                  </>
                )}

                {user.role === 'admin' && (
                  <>
                    <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500 font-bold">Admin Dashboard</Link>
                    <Link to="/admin/orders" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500">Live Orders</Link>
                    <Link to="/admin/menu" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500">Menu items</Link>
                    <Link to="/admin/payments" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500">Payments</Link>
                    <Link to="/admin/feedback" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500">Feedback Logs</Link>
                    <Link to="/admin/analytics" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300 hover:text-amber-500">Analytics</Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left text-sm text-red-400 block px-3 py-2 hover:bg-slate-800 rounded-xl"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 text-slate-300">Sign In</Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="text-sm block px-3 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-center">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
