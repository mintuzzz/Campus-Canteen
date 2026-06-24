import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { UtensilsCrossed, ToggleLeft, ToggleRight, Plus, ChefHat, Search, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface MenuItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  availability: boolean;
  description: string;
}

export const CanteenMenu: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  // Add item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Main Course', description: '', image: '', price: '' });
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const headers = { Authorization: `Bearer ${user?.token}` };

  const fetchMenu = async () => {
    try {
      const res = await axios.get(`${API_URL}/menu`);
      setItems(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMenu(); }, []);

  const toggleAvailability = async (item: MenuItem) => {
    setToggling(item._id);
    try {
      const updated = { ...item, availability: !item.availability };
      await axios.put(`${API_URL}/menu/${item._id}`, updated, { headers });
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, availability: !i.availability } : i));
      addToast('Updated', `${item.name} marked as ${!item.availability ? 'Available' : 'Sold Out'}`, 'success');
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to update', 'warning');
    } finally {
      setToggling(null);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newItem.name.trim() || !newItem.image.trim() || !newItem.price) {
      setFormError('Name, image URL, and price are required.');
      return;
    }
    setAdding(true);
    try {
      const res = await axios.post(`${API_URL}/menu`, {
        ...newItem,
        price: parseFloat(newItem.price),
        availability: true,
      }, { headers });
      setItems(prev => [res.data, ...prev]);
      setNewItem({ name: '', category: 'Main Course', description: '', image: '', price: '' });
      setShowAddForm(false);
      addToast('Item Added', `${res.data.name} added to today's menu`, 'success');
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const available = filtered.filter(i => i.availability);
  const soldOut = filtered.filter(i => !i.availability);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-teal-400 mb-1">
            <UtensilsCrossed size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Canteen Staff</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">Menu Management</h1>
          <p className="text-slate-400 text-xs mt-1">Toggle availability · Add today's items</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-teal-500/20"
        >
          <Plus size={13} /> Add Menu Item
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="glass-premium rounded-3xl p-6 border border-teal-500/20 mb-6 animate-fadeIn">
          <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Plus size={14} className="text-teal-400" /> Add New Item to Today's Menu
          </h3>
          {formError && (
            <div className="flex items-center gap-2 mb-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl p-3 text-xs">
              <AlertCircle size={13} /> {formError}
            </div>
          )}
          <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">Item Name *</label>
              <input type="text" placeholder="e.g. Paneer Butter Masala" value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full bg-slate-950/50 border border-slate-800 focus:border-teal-500 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium">Category</label>
              <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full bg-slate-950/50 border border-slate-800 focus:border-teal-500 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none">
                {['Breakfast', 'Main Course', 'Snacks', 'Beverages', 'Desserts', 'South Indian', 'North Indian', 'Fast Food'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium">Price (₹) * <span className="text-slate-500">(set by admin)</span></label>
              <input type="number" placeholder="e.g. 80" value={newItem.price}
                onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
                className="mt-1 w-full bg-slate-950/50 border border-slate-800 focus:border-teal-500 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium">Image URL *</label>
              <input type="text" placeholder="https://..." value={newItem.image}
                onChange={e => setNewItem(p => ({ ...p, image: e.target.value }))}
                className="mt-1 w-full bg-slate-950/50 border border-slate-800 focus:border-teal-500 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-400 font-medium">Description</label>
              <input type="text" placeholder="Short description..." value={newItem.description}
                onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                className="mt-1 w-full bg-slate-950/50 border border-slate-800 focus:border-teal-500 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">Cancel</button>
              <button type="submit" disabled={adding}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1.5">
                {adding ? 'Adding...' : <><Plus size={12} /> Add Item</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search menu items..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-900/60 border border-slate-800 focus:border-teal-500 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-200 focus:outline-none" />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-16 border border-slate-800 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {/* Available Items */}
          <div>
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
              Available ({available.length})
            </h2>
            {available.length === 0 ? (
              <p className="text-slate-500 text-xs">No available items.</p>
            ) : (
              <div className="space-y-2">
                {available.map(item => (
                  <div key={item._id} className="glass rounded-2xl p-3.5 border border-emerald-500/10 flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500">{item.category} · ₹{item.price}</p>
                    </div>
                    <button
                      onClick={() => toggleAvailability(item)}
                      disabled={toggling === item._id}
                      className="flex items-center gap-1.5 text-emerald-400 hover:text-red-400 transition-colors text-[10px] font-bold shrink-0"
                      title="Mark as Sold Out"
                    >
                      {toggling === item._id ? '...' : <ToggleRight size={20} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sold Out Items */}
          {soldOut.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">
                Sold Out ({soldOut.length})
              </h2>
              <div className="space-y-2">
                {soldOut.map(item => (
                  <div key={item._id} className="glass rounded-2xl p-3.5 border border-slate-800 opacity-60 flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover shrink-0 grayscale" onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-400 truncate line-through">{item.name}</p>
                      <p className="text-[10px] text-slate-600">{item.category}</p>
                    </div>
                    <button
                      onClick={() => toggleAvailability(item)}
                      disabled={toggling === item._id}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-400 transition-colors text-[10px] font-bold shrink-0"
                      title="Mark as Available"
                    >
                      {toggling === item._id ? '...' : <><ToggleLeft size={20} /> Restore</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
