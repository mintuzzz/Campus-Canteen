import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Eye, RefreshCw, X, ShieldAlert } from 'lucide-react';
import axios from 'axios';

interface FoodItem {
  _id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  ingredients: string[];
  price: number;
  availability: boolean;
  rating: number;
}

export const MenuManagement: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/menu`);
      setFoodItems(res.data);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    reset({
      name: '',
      description: '',
      image: '',
      category: 'Lunch',
      ingredients: '',
      price: '',
      availability: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: FoodItem) => {
    setEditingItem(item);
    reset({
      name: item.name,
      description: item.description,
      image: item.image,
      category: item.category,
      ingredients: item.ingredients.join(', '),
      price: item.price,
      availability: item.availability,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    if (!user) return;
    try {
      const payload = {
        ...data,
        price: Number(data.price),
        ingredients: data.ingredients ? data.ingredients.split(',').map((i: string) => i.trim()) : [],
      };

      if (editingItem) {
        // Edit PUT
        const res = await axios.put(`${API_URL}/menu/${editingItem._id}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setFoodItems((prev) => prev.map((item) => (item._id === editingItem._id ? res.data : item)));
        addToast('Food Item Updated', `${data.name} saved successfully.`, 'success');
      } else {
        // Add POST
        const res = await axios.post(`${API_URL}/menu`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setFoodItems((prev) => [res.data, ...prev]);
        addToast('Food Item Created', `${data.name} added to catalog.`, 'success');
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast('Menu Error', 'Failed to save food item.', 'warning');
    }
  };

  const handleToggleAvailability = async (item: FoodItem) => {
    if (!user) return;
    try {
      const nextAvailability = !item.availability;
      const res = await axios.put(
        `${API_URL}/menu/${item._id}`,
        { availability: nextAvailability },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setFoodItems((prev) => prev.map((f) => (f._id === item._id ? res.data : f)));
      addToast(
        'Availability Toggled',
        `${item.name} is now ${nextAvailability ? 'Available' : 'Sold Out'}`,
        'info'
      );
    } catch (err) {
      console.error(err);
      addToast('Error toggling availability', 'Failed to update item availability status.', 'warning');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to delete '${name}' from the menu?`)) return;

    try {
      await axios.delete(`${API_URL}/menu/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setFoodItems((prev) => prev.filter((item) => item._id !== id));
      addToast('Food Item Removed', `${name} deleted from menu catalog.`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Delete Error', 'Failed to delete food item.', 'warning');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Menu Catalog Management</h1>
          <p className="text-slate-400 text-xs mt-1">Configure food items, categories, ingredients and instant availability</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={openAddModal}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-500/10 active:scale-[0.98] transition-all"
          >
            <Plus size={14} /> Add Food Item
          </button>
        </div>
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="glass rounded-3xl h-64 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : foodItems.length === 0 ? (
        <div className="glass rounded-3xl p-16 border border-slate-800 text-center">
          <p className="text-slate-500 text-xs">No food items exist. Click 'Add Food Item' to start building your menu catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {foodItems.map((item) => (
            <div
              key={item._id}
              className="glass rounded-3xl overflow-hidden border border-slate-800 hover:border-slate-750 transition-all flex flex-col group relative"
            >
              {/* Product image */}
              <div className="relative h-40 w-full bg-slate-950 overflow-hidden shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Sold out tag overlay */}
                {!item.availability && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
                    <span className="text-[9px] font-bold tracking-wider uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>

              {/* Card Details */}
              <div className="p-5 flex-1 flex flex-col gap-1.5 justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                    <span>{item.category}</span>
                    <span>★ {item.rating > 0 ? item.rating : 'New'}</span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-200 truncate mt-1">{item.name}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-3 shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-slate-100">₹{item.price}</span>
                    
                    {/* Availability toggle */}
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`text-[9px] font-bold px-2 py-1 rounded ${
                        item.availability
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {item.availability ? 'Available' : 'Sold Out'}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold py-1.5 rounded-lg border border-slate-800 hover:text-white transition-colors text-[9px] flex items-center justify-center gap-1"
                    >
                      <Edit2 size={10} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id, item.name)}
                      className="bg-red-500/5 hover:bg-red-500/20 text-red-400 font-semibold py-1.5 rounded-lg border border-red-500/10 hover:border-transparent transition-all text-[9px] flex items-center justify-center gap-1"
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass-premium rounded-3xl p-6 md:p-8 border border-slate-800 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-slate-200 mb-6">
              {editingItem ? `Edit food: ${editingItem.name}` : 'Add New Food Item'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Food Name</label>
                <input
                  type="text"
                  required
                  placeholder="Chicken Fried Rice"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-red-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  {...register('name', { required: 'Food name is required' })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Category</label>
                  <select
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-red-500 rounded-xl py-2.5 px-3 cursor-pointer text-xs text-slate-300 focus:outline-none transition-colors"
                    {...register('category')}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="120"
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-red-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                    {...register('price', { required: true, min: 0 })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Description</label>
                <textarea
                  required
                  placeholder="Wholesome dish seasoned with green onions..."
                  rows={2}
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-red-500 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  {...register('description', { required: true })}
                />
              </div>

              {/* Ingredients */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Ingredients (comma separated)</label>
                <input
                  type="text"
                  placeholder="Basmati Rice, Chicken, Spring Onion, Soy Sauce"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-red-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  {...register('ingredients')}
                />
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... or leave blank for default"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-red-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  {...register('image')}
                />
              </div>

              {/* Availability check */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="availability"
                  className="rounded border-slate-800 text-red-500 focus:ring-red-500 bg-slate-950/50 cursor-pointer"
                  {...register('availability')}
                />
                <label htmlFor="availability" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Item is Available for Ordering Today
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-all text-xs mt-6"
              >
                {editingItem ? 'Save Changes' : 'Create Food Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
