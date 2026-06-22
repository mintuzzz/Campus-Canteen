const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const User = require('../models/User');

// Helper to determine sentiment based on rating and comment content
const analyzeSentiment = (avgRating, commentText = '') => {
  const text = commentText.toLowerCase();
  
  const positiveWords = ['good', 'great', 'delicious', 'yummy', 'excellent', 'amazing', 'perfect', 'clean', 'fresh', 'nice', 'best'];
  const negativeWords = ['bad', 'worst', 'spicy', 'dirty', 'late', 'slow', 'cold', 'salty', 'tasteless', 'oily', 'hair', 'expensive'];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    if (text.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (text.includes(word)) negativeCount++;
  });

  // Base classification on average stars
  if (avgRating >= 4.0) {
    if (negativeCount > positiveCount + 1) {
      return 'Neutral'; // Good stars but complaining text
    }
    return 'Positive';
  } else if (avgRating <= 2.5) {
    if (positiveCount > negativeCount + 1) {
      return 'Neutral'; // Poor stars but complimentary text
    }
    return 'Negative';
  } else {
    // Star rating is neutral (between 2.5 and 4.0)
    if (positiveCount > negativeCount) return 'Positive';
    if (negativeCount > positiveCount) return 'Negative';
    return 'Neutral';
  }
};

// Helper to recalculate average food item rating
const syncFoodItemRating = async (foodId) => {
  try {
    const food = await FoodItem.findById(foodId);
    if (!food || food.reviews.length === 0) return;

    const totalRating = food.reviews.reduce((acc, rev) => acc + rev.rating, 0);
    food.rating = Number((totalRating / food.reviews.length).toFixed(1));
    await food.save();
  } catch (error) {
    console.error('Error syncing food item rating:', error);
  }
};

// @desc    Submit feedback for a completed order
// @route   POST /api/feedback
// @access  Private
exports.submitFeedback = async (req, res) => {
  try {
    const { orderId, taste, quantity, hygiene, priceRating, service, comment, suggestions, complaints } = req.body;

    // 1. Verify order exists and belongs to the user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to review this order' });
    }

    // 2. Feedback can only be submitted after order completion
    if (order.status !== 'Completed') {
      return res.status(400).json({ message: 'Feedback can only be submitted for completed orders' });
    }

    // 3. One feedback per completed order
    const existingFeedback = await Feedback.findOne({ orderId });
    if (existingFeedback) {
      return res.status(400).json({ message: 'You have already submitted feedback for this order' });
    }

    // 4. Calculate sentiment
    const avgRating = (taste + quantity + hygiene + priceRating + service) / 5;
    const sentiment = analyzeSentiment(avgRating, comment);

    // 5. Create feedback
    const feedback = await Feedback.create({
      userId: req.user._id,
      orderId,
      taste,
      quantity,
      hygiene,
      priceRating,
      service,
      comment,
      suggestions,
      complaints,
      sentiment,
    });

    // 6. Sync reviews to individual FoodItems in the order
    const studentUser = await User.findById(req.user._id);
    for (const item of order.items) {
      await FoodItem.findByIdAndUpdate(item.foodId, {
        $push: {
          reviews: {
            userId: req.user._id,
            userName: studentUser.name,
            rating: Math.round(avgRating), // Rounded average rating
            comment: comment || 'Rated via order feedback',
          },
        },
      });
      await syncFoodItemRating(item.foodId);
    }

    res.status(201).json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error submitting feedback', error: error.message });
  }
};

// @desc    Edit feedback (Only within 24 hours of submission)
// @route   PUT /api/feedback/:id
// @access  Private
exports.editFeedback = async (req, res) => {
  try {
    const { taste, quantity, hygiene, priceRating, service, comment, suggestions, complaints } = req.body;

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback record not found' });
    }

    // Auth check
    if (feedback.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this feedback' });
    }

    // Check 24 hour edit lock
    const hoursElapsed = (new Date() - new Date(feedback.createdAt)) / (1000 * 60 * 60);
    if (hoursElapsed > 24) {
      return res.status(400).json({ message: 'Feedback edit window (24 hours) has expired' });
    }

    // Update feedback
    feedback.taste = taste || feedback.taste;
    feedback.quantity = quantity || feedback.quantity;
    feedback.hygiene = hygiene || feedback.hygiene;
    feedback.priceRating = priceRating || feedback.priceRating;
    feedback.service = service || feedback.service;
    feedback.comment = comment !== undefined ? comment : feedback.comment;
    feedback.suggestions = suggestions !== undefined ? suggestions : feedback.suggestions;
    feedback.complaints = complaints !== undefined ? complaints : feedback.complaints;

    // Recalculate sentiment
    const avgRating = (feedback.taste + feedback.quantity + feedback.hygiene + feedback.priceRating + feedback.service) / 5;
    feedback.sentiment = analyzeSentiment(avgRating, feedback.comment);

    const updatedFeedback = await feedback.save();

    // Sync updated review on corresponding FoodItems
    const order = await Order.findById(feedback.orderId);
    if (order) {
      for (const item of order.items) {
        await FoodItem.updateOne(
          { _id: item.foodId, 'reviews.userId': req.user._id },
          {
            $set: {
              'reviews.$.rating': Math.round(avgRating),
              'reviews.$.comment': feedback.comment || 'Rated via order feedback',
              'reviews.$.createdAt': new Date(),
            },
          }
        );
        await syncFoodItemRating(item.foodId);
      }
    }

    res.json(updatedFeedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating feedback', error: error.message });
  }
};

// @desc    Get feedback for a specific order
// @route   GET /api/feedback/order/:orderId
// @access  Private
exports.getFeedbackByOrderId = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ orderId: req.params.orderId });
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found for this order' });
    }
    res.json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching order feedback' });
  }
};

// @desc    Get all feedback records (Admin list)
// @route   GET /api/feedback
// @access  Private/Admin
exports.getAllFeedback = async (req, res) => {
  try {
    const { sentiment, rating } = req.query;
    let query = {};

    if (sentiment && sentiment !== 'All') {
      query.sentiment = sentiment;
    }

    const feedbacks = await Feedback.find(query)
      .populate('userId', 'name email phone studentId department')
      .populate({
        path: 'orderId',
        select: 'tokenNumber items totalAmount createdAt',
      })
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching feedback logs' });
  }
};
