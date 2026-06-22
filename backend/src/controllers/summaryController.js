const DailySummary = require('../models/DailySummary');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const FoodItem = require('../models/FoodItem');

// Helper to compile complaints and suggestions based on today's feedback
const compileComplaintsAndSuggestions = (feedbacks, mostPopular, leastPopular) => {
  const complaints = [];
  const suggestions = [];

  // Default suggestions/complaints if feedback is light
  if (feedbacks.length === 0) {
    return {
      complaints: ['No major complaints reported today.', 'Ensure regular ingredient supply lines.'],
      suggestions: [
        'Maintain high food standards.',
        `Promote today's favorite: ${mostPopular !== 'N/A' ? mostPopular : 'Special Meals'}.`,
        'Consider introducing fresh juice options on the evening menu.'
      ]
    };
  }

  // Keyword scanners
  let waitCount = 0;
  let spicyCount = 0;
  let quantityCount = 0;
  let hygieneCount = 0;
  let priceCount = 0;

  feedbacks.forEach(f => {
    const text = ((f.comment || '') + ' ' + (f.complaints || '') + ' ' + (f.suggestions || '')).toLowerCase();
    if (text.includes('wait') || text.includes('queue') || text.includes('slow') || text.includes('late') || text.includes('time')) waitCount++;
    if (text.includes('spicy') || text.includes('chili') || text.includes('pepper') || text.includes('hot')) spicyCount++;
    if (text.includes('quantity') || text.includes('portion') || text.includes('less') || text.includes('small')) quantityCount++;
    if (text.includes('hygiene') || text.includes('dirty') || text.includes('clean') || text.includes('hair') || text.includes('fly')) hygieneCount++;
    if (text.includes('price') || text.includes('expensive') || text.includes('cost')) priceCount++;
  });

  // Extract complaints
  if (waitCount > 0) complaints.push('Waiting time too long at pickup counter during rush hours.');
  if (spicyCount > 0) complaints.push('Some food items (especially curries) are reported to be too spicy.');
  if (quantityCount > 0) complaints.push('Portion sizes for main courses are perceived as small.');
  if (hygieneCount > 0) complaints.push('Cleanliness complaints near the handwash area and tray return.');
  if (priceCount > 0) complaints.push('Students feel some beverages and snacks are slightly overpriced.');

  // Default complaints if none triggered
  if (complaints.length === 0) {
    complaints.push('Slight rush during peak lunch hour (12:30 PM - 1:30 PM).');
    complaints.push('Minor complaints about cold food items served late.');
  }

  // Compile matching suggestions
  if (waitCount > 0) suggestions.push('Implement a dedicated quick-pickup counter for pre-paid token numbers.');
  if (spicyCount > 0) suggestions.push('Provide a mild spice option or clear spice-level tags on the menu.');
  if (quantityCount > 0) suggestions.push('Increase the default serving size of rice and gravy, or offer free extra rice.');
  if (hygieneCount > 0) suggestions.push('Increase cleaning frequency of tables and mandate gloves for servers.');
  if (priceCount > 0) suggestions.push('Review pricing of external brand snacks or offer combo value packs.');

  // Standard recommendations
  suggestions.push(`Review recipes for ${leastPopular !== 'N/A' ? leastPopular : 'least ordered meals'} to improve flavor.`);
  suggestions.push('Add more healthy juice and fresh fruit options for summer.');

  return { complaints, suggestions };
};

// @desc    Get or generate daily summary for a date
// @route   GET /api/summary/today
// @access  Private/Admin
exports.getDailySummary = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if summary already exists for today
    let dailySummary = await DailySummary.findOne({ date: todayStr });
    
    if (dailySummary) {
      return res.json(dailySummary);
    }

    // Generate daily summary for today on the fly
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Get today's orders
    const orders = await Order.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    const ordersToday = orders.length;
    const revenue = orders
      .filter(o => o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Get today's feedback
    const feedbacks = await Feedback.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    // Most/least ordered food item today
    let mostPopular = 'N/A';
    let leastPopular = 'N/A';

    if (ordersToday > 0) {
      const itemCounts = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      });

      const sortedFoods = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
      if (sortedFoods.length > 0) mostPopular = sortedFoods[0][0];
      if (sortedFoods.length > 1) leastPopular = sortedFoods[sortedFoods.length - 1][0];
    }

    // Compute ratings
    let totalFeedbackCount = feedbacks.length;
    let avgRating = 0;
    if (totalFeedbackCount > 0) {
      const sum = feedbacks.reduce((acc, f) => acc + (f.taste + f.quantity + f.hygiene + f.priceRating + f.service) / 5, 0);
      avgRating = Number((sum / totalFeedbackCount).toFixed(1));
    }

    // Complaint %
    let complaintCount = feedbacks.filter(f => f.complaints && f.complaints.trim().length > 0).length;
    let complaintPercentage = totalFeedbackCount > 0 ? Number(((complaintCount / totalFeedbackCount) * 100).toFixed(1)) : 0;

    // Compile text comments
    const { complaints, suggestions } = compileComplaintsAndSuggestions(feedbacks, mostPopular, leastPopular);

    // Format AI style summary text
    const summaryText = `Daily mess report for ${todayStr}. Total of ${ordersToday} orders processed successfully. Overall dining feedback average stands at ${avgRating || 'N/A'} stars across categories. The highest ordering peak occurred at standard mess timings. Popular request remains ${mostPopular !== 'N/A' ? mostPopular : 'unspecified'}. Complaints mainly touch on: ${complaints.join(' ')}`;
    
    const recommendationsText = suggestions.join('\n');

    // Create and save
    dailySummary = await DailySummary.create({
      date: todayStr,
      summary: summaryText,
      recommendations: recommendationsText,
      metadata: {
        ordersToday,
        revenue,
        mostPopular,
        leastPopular,
        complaintPercentage,
        averageRating: avgRating,
      }
    });

    res.json(dailySummary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating daily summary', error: error.message });
  }
};

// @desc    Get all historical summaries
// @route   GET /api/summary
// @access  Private/Admin
exports.getHistoricalSummaries = async (req, res) => {
  try {
    const summaries = await DailySummary.find().sort({ date: -1 });
    res.json(summaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching historical reports' });
  }
};
