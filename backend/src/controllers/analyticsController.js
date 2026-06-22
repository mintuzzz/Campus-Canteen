const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const FoodItem = require('../models/FoodItem');

// @desc    Get dashboard charts and metrics
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    // 1. Core Metrics Calculations
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'Completed' });
    const pendingOrders = await Order.countDocuments({ status: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready'] } });
    
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const feedbacks = await Feedback.find();
    const totalFeedbackCount = feedbacks.length;
    
    let avgRating = 0;
    let tasteAvg = 0, hygieneAvg = 0, serviceAvg = 0, priceAvg = 0, quantityAvg = 0;
    let complaintCount = 0;

    if (totalFeedbackCount > 0) {
      const sum = feedbacks.reduce((acc, f) => {
        if (f.complaints && f.complaints.trim().length > 0) {
          complaintCount++;
        }
        return {
          taste: acc.taste + f.taste,
          quantity: acc.quantity + f.quantity,
          hygiene: acc.hygiene + f.hygiene,
          priceRating: acc.priceRating + f.priceRating,
          service: acc.service + f.service,
        };
      }, { taste: 0, quantity: 0, hygiene: 0, priceRating: 0, service: 0 });

      tasteAvg = Number((sum.taste / totalFeedbackCount).toFixed(1));
      quantityAvg = Number((sum.quantity / totalFeedbackCount).toFixed(1));
      hygieneAvg = Number((sum.hygiene / totalFeedbackCount).toFixed(1));
      priceAvg = Number((sum.priceRating / totalFeedbackCount).toFixed(1));
      serviceAvg = Number((sum.service / totalFeedbackCount).toFixed(1));
      
      avgRating = Number(((tasteAvg + quantityAvg + hygieneAvg + priceAvg + serviceAvg) / 5).toFixed(1));
    }

    const complaintPercentage = totalFeedbackCount > 0 
      ? Number(((complaintCount / totalFeedbackCount) * 100).toFixed(1))
      : 0;

    // Food list rankings
    const foodItemsOrdered = await FoodItem.find().sort({ rating: -1 });
    const foodsWithRatings = foodItemsOrdered.filter(f => f.reviews && f.reviews.length > 0);
    const mostLikedFood = foodsWithRatings[0]?.name || 'N/A';
    const leastLikedFood = foodsWithRatings.length > 0 ? foodsWithRatings[foodsWithRatings.length - 1]?.name : 'N/A';

    // 2. Charts Aggregation
    
    // Orders & Revenue per day (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const ordersPerDay = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format ordersPerDay to fill empty dates
    const formattedOrdersPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = ordersPerDay.find(item => item._id === dateStr);
      formattedOrdersPerDay.push({
        date: dateStr,
        orders: match ? match.orders : 0,
        revenue: match ? match.revenue : 0
      });
    }

    // Ratings Distribution
    const ratingsDistribution = [
      { rating: '5 Stars', count: 0 },
      { rating: '4 Stars', count: 0 },
      { rating: '3 Stars', count: 0 },
      { rating: '2 Stars', count: 0 },
      { rating: '1 Star', count: 0 }
    ];

    feedbacks.forEach(f => {
      const avg = Math.round((f.taste + f.quantity + f.hygiene + f.priceRating + f.service) / 5);
      if (avg === 5) ratingsDistribution[0].count++;
      else if (avg === 4) ratingsDistribution[1].count++;
      else if (avg === 3) ratingsDistribution[2].count++;
      else if (avg === 2) ratingsDistribution[3].count++;
      else if (avg === 1) ratingsDistribution[4].count++;
    });

    // Most Ordered Foods
    const mostOrderedFoodsAgg = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    const mostOrderedFoods = mostOrderedFoodsAgg.map(item => ({
      name: item._id,
      quantity: item.quantity
    }));

    // Least Liked Foods
    const leastLikedFoods = foodsWithRatings
      .slice(-5)
      .reverse() // from lowest up
      .map(item => ({
        name: item.name,
        rating: item.rating
      }));

    // Sentiment Breakdown
    const sentimentBreakdown = [
      { name: 'Positive', value: 0 },
      { name: 'Neutral', value: 0 },
      { name: 'Negative', value: 0 }
    ];

    feedbacks.forEach(f => {
      if (f.sentiment === 'Positive') sentimentBreakdown[0].value++;
      else if (f.sentiment === 'Neutral') sentimentBreakdown[1].value++;
      else if (f.sentiment === 'Negative') sentimentBreakdown[2].value++;
    });

    // Peak Ordering Hours
    const peakOrderingHoursAgg = await Order.aggregate([
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format all 24 hours or just standard breakfast/lunch/dinner peaks
    const formattedPeakHours = Array.from({ length: 15 }, (_, i) => {
      const hour = i + 7; // 7 AM to 9 PM
      const match = peakOrderingHoursAgg.find(item => item._id === hour);
      const label = hour >= 12 ? `${hour === 12 ? 12 : hour - 12} PM` : `${hour} AM`;
      return {
        hour: label,
        count: match ? match.count : 0
      };
    });

    res.json({
      metrics: {
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue,
        totalFeedback: totalFeedbackCount,
        averageRating: avgRating,
        tasteAvg,
        hygieneAvg,
        serviceAvg,
        priceAvg,
        quantityAvg,
        complaintPercentage,
        mostLikedFood,
        leastLikedFood,
      },
      charts: {
        ordersPerDay: formattedOrdersPerDay,
        ratingsDistribution,
        mostOrderedFoods,
        leastLikedFoods,
        sentimentBreakdown,
        peakOrderingHours: formattedPeakHours,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error compiling analytics dashboard' });
  }
};
