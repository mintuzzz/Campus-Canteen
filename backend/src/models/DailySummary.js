const mongoose = require('mongoose');

const DailySummarySchema = new mongoose.Schema({
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
    unique: true,
  },
  summary: {
    type: String,
    required: true,
  },
  recommendations: {
    type: String,
    required: true,
  },
  metadata: {
    ordersToday: Number,
    revenue: Number,
    mostPopular: String,
    leastPopular: String,
    complaintPercentage: Number,
    averageRating: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('DailySummary', DailySummarySchema);
