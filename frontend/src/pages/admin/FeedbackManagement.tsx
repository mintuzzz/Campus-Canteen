import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Search, MessageSquare, Download, Star, Sparkles, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface FeedbackItem {
  _id: string;
  userId: { name: string; studentId: string; department: string };
  orderId: { tokenNumber: string; totalAmount: number };
  taste: number;
  quantity: number;
  hygiene: number;
  priceRating: number;
  service: number;
  comment: string;
  suggestions: string;
  complaints: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  createdAt: string;
}

export const FeedbackManagement: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('All');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchFeedbacks = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/feedback`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params: { sentiment: sentimentFilter === 'All' ? undefined : sentimentFilter },
      });
      setFeedbacks(res.data);
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [user, sentimentFilter]);

  const handleExportCSV = () => {
    if (feedbacks.length === 0) return;

    // Build headers
    const headers = ['Feedback ID', 'Student', 'Student ID', 'Dept', 'Token', 'Avg Star', 'Taste', 'Quantity', 'Hygiene', 'Price', 'Service', 'Comment', 'Sentiment', 'Complaints', 'Suggestions', 'Date'];
    
    // Build rows
    const rows = feedbacks.map((fb) => {
      const avg = ((fb.taste + fb.quantity + fb.hygiene + fb.priceRating + fb.service) / 5).toFixed(1);
      return [
        fb._id,
        fb.userId?.name || 'Seeded User',
        fb.userId?.studentId || 'N/A',
        fb.userId?.department || 'N/A',
        fb.orderId?.tokenNumber || 'N/A',
        avg,
        fb.taste,
        fb.quantity,
        fb.hygiene,
        fb.priceRating,
        fb.service,
        `"${(fb.comment || '').replace(/"/g, '""')}"`,
        fb.sentiment,
        `"${(fb.complaints || '').replace(/"/g, '""')}"`,
        `"${(fb.suggestions || '').replace(/"/g, '""')}"`,
        new Date(fb.createdAt).toLocaleDateString()
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `canteen_feedback_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);

    addToast('Report Exported', 'CSV summary generated and downloaded successfully.', 'success');
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const name = fb.userId?.name || '';
    const comment = fb.comment || '';
    const complaints = fb.complaints || '';
    const suggestions = fb.suggestions || '';

    const matchesSearch = 
      name.toLowerCase().includes(search.toLowerCase()) ||
      comment.toLowerCase().includes(search.toLowerCase()) ||
      complaints.toLowerCase().includes(search.toLowerCase()) ||
      suggestions.toLowerCase().includes(search.toLowerCase()) ||
      (fb.orderId?.tokenNumber || '').toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Dining Feedback Logs</h1>
          <p className="text-slate-400 text-xs mt-1">Audit customer comments, sentiment scores, and category ratings</p>
        </div>
        <div className="flex gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-750 transition-colors"
          >
            <Download size={13} /> Export Report (CSV)
          </button>
          <button
            onClick={fetchFeedbacks}
            className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Refresh logs"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Query Filters */}
      <div className="glass rounded-3xl p-5 mb-8 border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by student, comment, or token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 focus:border-red-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none transition-colors"
          />
        </div>

        {/* Sentiment filters */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {['All', 'Positive', 'Neutral', 'Negative'].map((sentiment) => (
            <button
              key={sentiment}
              onClick={() => setSentimentFilter(sentiment)}
              className={`text-xs font-bold px-4 py-2 rounded-full border transition-all ${
                sentimentFilter === sentiment
                  ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/10'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-750 hover:text-white'
              }`}
            >
              {sentiment}
            </button>
          ))}
        </div>
      </div>

      {/* Feedbacks Listing */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="glass rounded-3xl h-36 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="glass rounded-3xl p-16 border border-slate-800 text-center">
          <p className="text-slate-500 text-xs">No feedback records found matching active filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredFeedbacks.map((fb) => {
            const avg = ((fb.taste + fb.quantity + fb.hygiene + fb.priceRating + fb.service) / 5).toFixed(1);
            return (
              <div
                key={fb._id}
                className="glass rounded-3xl p-6 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row gap-6"
              >
                {/* Details Left */}
                <div className="md:w-64 space-y-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      fb.sentiment === 'Positive'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : fb.sentiment === 'Negative'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {fb.sentiment}
                    </span>
                    <span className="text-[10px] bg-slate-950 px-2 py-0.5 border border-slate-900 rounded font-mono text-slate-400">
                      Token: {fb.orderId?.tokenNumber || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{fb.userId?.name || 'Seeded User'}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">ID: {fb.userId?.studentId || 'N/A'}</p>
                    <p className="text-[10px] text-slate-500">Dept: {fb.userId?.department || 'N/A'}</p>
                    <p className="text-[9px] text-slate-600 mt-1">{new Date(fb.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Star Scores and comments Middle/Right */}
                <div className="flex-1 flex flex-col gap-4 justify-between">
                  {/* Score Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-slate-950/30 p-3 rounded-xl border border-slate-900 text-[10px] text-slate-400">
                    <div className="bg-slate-950/20 p-1.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block uppercase">Overall</span>
                      <span className="text-xs font-extrabold text-amber-500">★ {avg}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block">Taste</span>
                      <span className="font-semibold text-slate-300">{fb.taste} / 5</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block">Portion</span>
                      <span className="font-semibold text-slate-300">{fb.quantity} / 5</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block">Hygiene</span>
                      <span className="font-semibold text-slate-300">{fb.hygiene} / 5</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block">Pricing</span>
                      <span className="font-semibold text-slate-300">{fb.priceRating} / 5</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block">Service</span>
                      <span className="font-semibold text-slate-300">{fb.service} / 5</span>
                    </div>
                  </div>

                  {/* Comment Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Comment</span>
                      <p className="text-slate-300 font-medium leading-relaxed italic">
                        "{fb.comment || 'No text review submitted.'}"
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase text-amber-500">Suggestions</span>
                      <p className="text-slate-300 font-semibold leading-relaxed">
                        {fb.suggestions || '—'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase text-red-400">Complaints</span>
                      <p className="text-slate-300 font-semibold leading-relaxed">
                        {fb.complaints || '—'}
                      </p>
                    </div>
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
