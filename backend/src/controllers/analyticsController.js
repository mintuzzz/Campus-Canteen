const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const FoodItem = require('../models/FoodItem');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get dashboard charts, metrics, and reputation logs
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'Completed' });
    const pendingOrders = await Order.countDocuments({ status: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Paid'] } });

    // Payment Counts
    const successfulPaymentsCount = await Order.countDocuments({ paymentStatus: 'Paid' });
    const failedPaymentsCount = await Order.countDocuments({ paymentStatus: 'Failed' });
    const refundedPaymentsCount = await Order.countDocuments({ paymentStatus: 'Refunded' });

    // Revenue Aggregates
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Today's, Weekly, and Monthly Revenue
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeekly = new Date();
    startOfWeekly.setDate(startOfWeekly.getDate() - 7);

    const startOfMonthly = new Date();
    startOfMonthly.setDate(startOfMonthly.getDate() - 30);

    const todayRevRes = await Order.aggregate([
      { $match: { paymentStatus: 'Paid', createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const todayRevenue = todayRevRes[0]?.total || 0;

    const weeklyRevRes = await Order.aggregate([
      { $match: { paymentStatus: 'Paid', createdAt: { $gte: startOfWeekly } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const weeklyRevenue = weeklyRevRes[0]?.total || 0;

    const monthlyRevRes = await Order.aggregate([
      { $match: { paymentStatus: 'Paid', createdAt: { $gte: startOfMonthly } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const monthlyRevenue = monthlyRevRes[0]?.total || 0;

    // Food Waste & Lost Revenue Analytics
    // Food Wasted: Sum total amount of cancelled/no-show orders (representing prep value wasted)
    const foodWastedRes = await Order.aggregate([
      { $match: { status: 'Cancelled', paymentStatus: 'Refunded' } }, // Orders paid but eventually cancelled (no-show/refunded)
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const foodWastedValue = foodWastedRes[0]?.total || 0;

    // Revenue Lost: Sum of all Cancelled, Refunded, or Failed orders
    const revenueLostRes = await Order.aggregate([
      { $match: { $or: [{ status: 'Cancelled' }, { paymentStatus: 'Refunded' }, { paymentStatus: 'Failed' }] } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const revenueLost = revenueLostRes[0]?.total || 0;

    // Refund Reports sum
    const refundReportsRes = await Order.aggregate([
      { $match: { paymentStatus: 'Refunded' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRefundedAmount = refundReportsRes[0]?.total || 0;

    // Feedbacks compile
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

    // Food ratings
    const foodItemsOrdered = await FoodItem.find().sort({ rating: -1 });
    const foodsWithRatings = foodItemsOrdered.filter(f => f.reviews && f.reviews.length > 0);
    const mostLikedFood = foodsWithRatings[0]?.name || 'N/A';
    const leastLikedFood = foodsWithRatings.length > 0 ? foodsWithRatings[foodsWithRatings.length - 1]?.name : 'N/A';

    // 7 days charts data
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

    // Most Cancelled Items
    const mostCancelledFoodsAgg = await Order.aggregate([
      { $match: { status: 'Cancelled' } },
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

    const mostCancelledFoods = mostCancelledFoodsAgg.map(item => ({
      name: item._id,
      quantity: item.quantity
    }));

    // Sentiment breakdown
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

    // Student Reputation lists
    const noShowUsers = await User.find({ noShowCount: { $gt: 0 } })
      .select('name email studentId noShowCount warningCount penaltyStatus')
      .sort({ noShowCount: -1 })
      .limit(10);

    const suspendedUsers = await User.find({ penaltyStatus: 'Suspended' })
      .select('name email studentId warningCount suspensionUntil');

    res.json({
      metrics: {
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue,
        todayRevenue,
        weeklyRevenue,
        monthlyRevenue,
        successfulPaymentsCount,
        failedPaymentsCount,
        refundedPaymentsCount,
        totalRefundedAmount,
        foodWastedValue,
        revenueLost,
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
        mostCancelledFoods,
        sentimentBreakdown,
      },
      reputation: {
        noShowUsers,
        suspendedUsers,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error compiling analytics dashboard' });
  }
};

// @desc    Get system audit logs
// @route   GET /api/analytics/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('orderId', 'tokenNumber')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving system audit logs' });
  }
};
