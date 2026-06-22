const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  taste: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  hygiene: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  priceRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  service: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: '',
  },
  suggestions: {
    type: String,
    default: '',
  },
  complaints: {
    type: String,
    default: '',
  },
  sentiment: {
    type: String,
    enum: ['Positive', 'Neutral', 'Negative'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
