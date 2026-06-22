import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Star, MessageSquare, ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';
import axios from 'axios';

interface FeedbackData {
  _id: string;
  taste: number;
  quantity: number;
  hygiene: number;
  priceRating: number;
  service: number;
  comment: string;
  suggestions: string;
  complaints: string;
  sentiment: string;
  createdAt: string;
}

export const FeedbackForm: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useSocket();

  const [loading, setLoading] = useState(true);
  const [existingFeedback, setExistingFeedback] = useState<FeedbackData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockExpired, setLockExpired] = useState(false);

  // Form states
  const [taste, setTaste] = useState(5);
  const [quantity, setQuantity] = useState(5);
  const [hygiene, setHygiene] = useState(5);
  const [priceRating, setPriceRating] = useState(5);
  const [service, setService] = useState(5);
  const [comment, setComment] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [complaints, setComplaints] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const checkExistingFeedback = async () => {
      if (!orderId || !user) return;
      try {
        const res = await axios.get(`${API_URL}/feedback/order/${orderId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (res.data) {
          const fb: FeedbackData = res.data;
          setExistingFeedback(fb);
          
          // Populate states
          setTaste(fb.taste);
          setQuantity(fb.quantity);
          setHygiene(fb.hygiene);
          setPriceRating(fb.priceRating);
          setService(fb.service);
          setComment(fb.comment || '');
          setSuggestions(fb.suggestions || '');
          setComplaints(fb.complaints || '');

          // Check if 24 hours have elapsed
          const elapsedHours = (new Date().getTime() - new Date(fb.createdAt).getTime()) / (1000 * 60 * 60);
          if (elapsedHours > 24) {
            setLockExpired(true);
          }
        }
      } catch (err) {
        // Feedback doesn't exist yet, which is fine
        console.log('No existing feedback for this order.');
      } finally {
        setLoading(false);
      }
    };
    checkExistingFeedback();
  }, [orderId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !user || lockExpired) return;
    setSubmitting(true);

    const payload = {
      orderId,
      taste,
      quantity,
      hygiene,
      priceRating,
      service,
      comment,
      suggestions,
      complaints,
    };

    try {
      if (existingFeedback) {
        // Update Feedback (PUT)
        await axios.put(`${API_URL}/feedback/${existingFeedback._id}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        addToast('Feedback Updated', 'Your dining review has been updated successfully.', 'success');
      } else {
        // Create Feedback (POST)
        await axios.post(`${API_URL}/feedback`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        addToast('Feedback Submitted', 'Thank you! Your dining review was saved.', 'success');
      }
      navigate('/history');
    } catch (err: any) {
      console.error(err);
      addToast('Feedback Error', err.response?.data?.message || 'Failed to submit review.', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const StarSelector: React.FC<{ label: string; val: number; setVal: (n: number) => void }> = ({ label, val, setVal }) => (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-900 pb-3">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const ratingVal = i + 1;
          const filled = ratingVal <= val;
          return (
            <button
              type="button"
              key={i}
              disabled={lockExpired}
              onClick={() => setVal(ratingVal)}
              className={`p-1 transition-all ${lockExpired ? 'cursor-not-allowed' : 'hover:scale-110'}`}
            >
              <Star
                size={20}
                className={filled ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
              />
            </button>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Back button */}
      <Link to="/history" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-xs font-semibold">
        <ArrowLeft size={14} /> Back to History
      </Link>

      <div className="glass-premium rounded-3xl p-6 md:p-8 border border-slate-800 relative">
        <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-100">Dining Quality Feedback</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Order ID: {orderId?.toUpperCase()}</p>
          </div>
          {existingFeedback && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              lockExpired ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {lockExpired ? '24hr Locked (Read Only)' : 'Active (Editable)'}
            </span>
          )}
        </div>

        {lockExpired && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-400">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-red-300">
              The 24-hour edit lock window for this feedback has expired. Submissions are now locked and stored in archives.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star selector matrices */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Review Categories</h3>
            <StarSelector label="Taste & Quality" val={taste} setVal={setTaste} />
            <StarSelector label="Portion Quantity" val={quantity} setVal={setQuantity} />
            <StarSelector label="Dining Hygiene" val={hygiene} setVal={setHygiene} />
            <StarSelector label="Pricing & Value" val={priceRating} setVal={setPriceRating} />
            <StarSelector label="Canteen Service" val={service} setVal={setService} />
          </div>

          {/* Text Areas */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Granular Remarks</h3>
            
            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold">General Dining Review</label>
              <textarea
                disabled={lockExpired}
                placeholder="How was your meal overall?"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
              />
            </div>

            {/* Suggestions */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold">Suggestions Box</label>
              <textarea
                disabled={lockExpired}
                placeholder="Any recommendations to improve this dish or our serving?"
                rows={2}
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
              />
            </div>

            {/* Complaints */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold">Complaints Box</label>
              <textarea
                disabled={lockExpired}
                placeholder="Did you encounter any hygiene issues, late serving, or cold food?"
                rows={2}
                value={complaints}
                onChange={(e) => setComplaints(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Sentiment Tag (If existing) */}
          {existingFeedback && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Auto-analyzed Sentiment:</span>
              <span className={`font-extrabold uppercase px-2.5 py-0.5 rounded ${
                existingFeedback.sentiment === 'Positive'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : existingFeedback.sentiment === 'Negative'
                  ? 'bg-red-500/10 text-red-400 animate-pulse'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {existingFeedback.sentiment}
              </span>
            </div>
          )}

          {/* Submit Action */}
          {!lockExpired && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 text-xs mt-8"
            >
              {submitting ? 'Submitting review logs...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
