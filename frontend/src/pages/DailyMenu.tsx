import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { Search, Star, Heart, ShoppingCart, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
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

export const DailyMenu: React.FC = () => {
  const { addToCart } = useCart();
  const { addToast } = useSocket();

  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('rating');
  const [favorites, setFavorites] = useState<string[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages'];

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/menu`, {
        params: { search, category, sort },
      });
      setFoodItems(res.data);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [search, category, sort]);

  // Load favorites from local storage on mount
  useEffect(() => {
    const favsStr = localStorage.getItem('canteen_favorites');
    if (favsStr) {
      setFavorites(JSON.parse(favsStr));
    }
  }, []);

  const toggleFavorite = (id: string, name: string) => {
    let updatedFavs;
    if (favorites.includes(id)) {
      updatedFavs = favorites.filter((fId) => fId !== id);
      addToast('Removed Favorite', `${name} removed from your favorites list.`, 'info');
    } else {
      updatedFavs = [...favorites, id];
      addToast('Added Favorite', `${name} added to your favorites list.`, 'success');
    }
    setFavorites(updatedFavs);
    localStorage.setItem('canteen_favorites', JSON.stringify(updatedFavs));
  };

  const handleAddToCart = (item: FoodItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (!item.availability) return;
    addToCart({
      foodId: item._id,
      name: item.name,
      image: item.image,
      price: item.price,
    }, 1);
    addToast('Added to Cart', `${item.name} added to your cart successfully.`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Today's Daily Menu</h1>
          <p className="text-slate-400 text-xs mt-1">Freshly cooked meals, snacks and refreshments on campus</p>
        </div>
      </div>

      {/* Filters & Search Sheet */}
      <div className="glass rounded-3xl p-5 mb-8 border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search food items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 focus:border-amber-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <ArrowUpDown size={14} className="text-slate-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-slate-950/40 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="rating">Sort: Top Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs font-bold px-5 py-2.5 rounded-full shrink-0 transition-all ${
              category === cat
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/40 text-slate-300 border border-slate-800/50 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
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
          <p className="text-slate-500 text-sm">No food items found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {foodItems.map((item) => (
            <Link
              key={item._id}
              to={`/menu/${item._id}`}
              className="glass rounded-3xl overflow-hidden border border-slate-800 hover:border-slate-700/80 transition-all duration-300 flex flex-col group relative"
            >
              {/* Product Image */}
              <div className="relative h-44 w-full bg-slate-950 overflow-hidden shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                />
                
                {/* Availability Tag */}
                {!item.availability && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                      Sold Out
                    </span>
                  </div>
                )}

                {/* Favorite Icon */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(item._id, item.name);
                  }}
                  className="absolute top-3 right-3 bg-slate-950/60 hover:bg-slate-950/80 p-2 rounded-xl border border-white/5 transition-all text-slate-300 hover:text-red-400"
                >
                  <Heart
                    size={14}
                    className={favorites.includes(item._id) ? 'fill-red-500 stroke-red-500' : ''}
                  />
                </button>
              </div>

              {/* Card Details */}
              <div className="p-5 flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-amber-500/80 font-bold uppercase">{item.category}</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                    <Star size={10} className="text-amber-400 fill-amber-400" />
                    <span>{item.rating > 0 ? item.rating : 'New'}</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-200 truncate mt-1">{item.name}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed flex-1">
                  {item.description}
                </p>

                {/* Footer Action */}
                <div className="flex items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-800/80 shrink-0">
                  <span className="text-sm font-extrabold text-slate-100">₹{item.price}</span>
                  
                  {item.availability ? (
                    <button
                      onClick={(e) => handleAddToCart(item, e)}
                      className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1.5 shadow-lg shadow-amber-500/5 transition-all"
                    >
                      <ShoppingCart size={11} className="stroke-[2.5]" /> Add
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-semibold">Unavailable</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
