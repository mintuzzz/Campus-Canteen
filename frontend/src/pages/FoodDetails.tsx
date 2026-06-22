import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { Star, Heart, ShoppingCart, ArrowLeft, ShieldAlert } from 'lucide-react';
import axios from 'axios';

interface Review {
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

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
  reviews: Review[];
}

export const FoodDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToast } = useSocket();

  const [foodItem, setFoodItem] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      try {
        const res = await axios.get(`${API_URL}/menu/${id}`);
        setFoodItem(res.data);
      } catch (err) {
        console.error('Error fetching food item details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  useEffect(() => {
    const favsStr = localStorage.getItem('canteen_favorites');
    if (favsStr) {
      setFavorites(JSON.parse(favsStr));
    }
  }, []);

  const isFavorite = foodItem ? favorites.includes(foodItem._id) : false;

  const toggleFavorite = () => {
    if (!foodItem) return;
    let updatedFavs;
    if (isFavorite) {
      updatedFavs = favorites.filter((fId) => fId !== foodItem._id);
      addToast('Removed Favorite', `${foodItem.name} removed from your favorites list.`, 'info');
    } else {
      updatedFavs = [...favorites, foodItem._id];
      addToast('Added Favorite', `${foodItem.name} added to your favorites list.`, 'success');
    }
    setFavorites(updatedFavs);
    localStorage.setItem('canteen_favorites', JSON.stringify(updatedFavs));
  };

  const handleAddToCart = (buyNow = false) => {
    if (!foodItem || !foodItem.availability) return;
    
    addToCart({
      foodId: foodItem._id,
      name: foodItem.name,
      image: foodItem.image,
      price: foodItem.price,
    }, quantity);
    
    addToast('Added to Cart', `${foodItem.name} added to your cart successfully.`, 'success');
    
    if (buyNow) {
      navigate('/cart');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!foodItem) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-200">Food Item Not Found</h2>
        <p className="text-slate-400 text-xs mt-2 mb-6">The requested dish details might have been removed by admin.</p>
        <Link to="/menu" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs">Back to Menu</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Back Button */}
      <Link to="/menu" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-xs font-semibold">
        <ArrowLeft size={14} /> Back to Daily Menu
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Left Side: Large Product Image */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 h-[300px] md:h-[450px]">
          <img
            src={foodItem.image}
            alt={foodItem.name}
            className="w-full h-full object-cover"
          />
          {!foodItem.availability && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-full">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Product Details & Controls */}
        <div className="flex flex-col gap-5 justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                {foodItem.category}
              </span>
              <button
                onClick={toggleFavorite}
                className="bg-slate-850 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-800 transition-all text-slate-400 hover:text-red-500"
              >
                <Heart size={16} className={isFavorite ? 'fill-red-500 stroke-red-500' : ''} />
              </button>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">{foodItem.name}</h1>
            
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    size={13}
                    className={idx < Math.round(foodItem.rating) ? 'fill-amber-400' : 'text-slate-700'}
                  />
                ))}
              </div>
              <span className="font-semibold text-slate-300">
                {foodItem.rating > 0 ? `${foodItem.rating} Average Rating` : 'No ratings yet'}
              </span>
              <span>•</span>
              <span>{foodItem.reviews.length} reviews</span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">{foodItem.description}</p>

            {/* Ingredients */}
            {foodItem.ingredients.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-400 mb-2">Ingredients</h4>
                <div className="flex flex-wrap gap-2">
                  {foodItem.ingredients.map((ing) => (
                    <span key={ing} className="bg-slate-800/60 text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-800">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing and Cart Buttons */}
          <div className="glass rounded-2xl p-5 border border-slate-800 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Price per portion</span>
                <p className="text-xl font-extrabold text-slate-100">₹{foodItem.price}</p>
              </div>

              {foodItem.availability && (
                <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800 rounded-xl px-2.5 py-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-slate-400 hover:text-white px-2 py-0.5 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-slate-200 w-5 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="text-slate-400 hover:text-white px-2 py-0.5 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {foodItem.availability ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleAddToCart(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <ShoppingCart size={14} /> Add to Cart
                </button>
                <button
                  onClick={() => handleAddToCart(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-transform active:scale-95"
                >
                  Buy Now
                </button>
              </div>
            ) : (
              <button
                disabled
                className="w-full bg-slate-800 text-slate-500 font-bold py-2.5 rounded-xl text-xs cursor-not-allowed text-center"
              >
                Food Currently Sold Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t border-slate-800/80 pt-8">
        <h3 className="text-base font-extrabold text-slate-200 mb-6">Ratings & Reviews ({foodItem.reviews.length})</h3>

        {foodItem.reviews.length === 0 ? (
          <p className="text-xs text-slate-500 py-6">There are no reviews for this food item yet. Place an order to submit feedback!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {foodItem.reviews.map((rev, idx) => (
              <div key={idx} className="glass rounded-2xl p-4.5 border border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2.5">
                    {/* User profile avatar circle */}
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 font-extrabold text-xs flex items-center justify-center uppercase border border-amber-500/20">
                      {rev.userName.slice(0, 2)}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-200 leading-normal">{rev.userName}</h5>
                      <span className="text-[9px] text-slate-500">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
                    <Star size={10} className="fill-amber-400" />
                    <span className="text-[10px] font-extrabold">{rev.rating}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-1 mt-1">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
