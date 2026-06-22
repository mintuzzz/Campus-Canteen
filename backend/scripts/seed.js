const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e);
}
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const FoodItem = require('../src/models/FoodItem');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const Feedback = require('../src/models/Feedback');
const DailySummary = require('../src/models/DailySummary');
const Notification = require('../src/models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/canteen';

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB. Clearing existing collections...');

    // Clear existing data
    await User.deleteMany({});
    await FoodItem.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Feedback.deleteMany({});
    await DailySummary.deleteMany({});
    await Notification.deleteMany({});

    console.log('Collections cleared. Seeding users...');

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);
    const hashedAdminPassword = await bcrypt.hash('admin123', salt);
    const hashedStudentPassword = await bcrypt.hash('student123', salt);

    const admin = await User.create({
      name: 'Canteen Supervisor',
      email: 'admin@canteen.com',
      phone: '9876543210',
      password: 'admin123', // Schema pre-save hook will double-hash if password is plain. Wait, UserSchema HAS a pre-save hook that hashes the password! So we MUST pass plain text password, not hashed! Yes, mongoose save hook runs on User.create! Let's pass plain text.
      role: 'admin',
    });

    const student = await User.create({
      name: 'Rohan Sharma',
      email: 'student@canteen.com',
      phone: '9988776655',
      studentId: 'STU2026049',
      department: 'Computer Science',
      password: 'student123', // plain text (pre-save hook will hash it)
      role: 'student',
    });

    // Create a few other students for feedback variety
    const student2 = await User.create({
      name: 'Ananya Iyer',
      email: 'ananya@student.com',
      phone: '9944332211',
      studentId: 'STU2026112',
      department: 'Electronics',
      password: 'student123',
      role: 'student',
    });

    const student3 = await User.create({
      name: 'Vikram Singh',
      email: 'vikram@student.com',
      phone: '9865432107',
      studentId: 'STU2026078',
      department: 'Mechanical',
      password: 'student123',
      role: 'student',
    });

    console.log('Users seeded. Seeding menu items...');

    // 2. Create Food Items
    const foodItemsData = [
      // Breakfast
      {
        name: 'Masala Dosa',
        description: 'Crispy rice crepe filled with spiced potato mash, served with coconut chutney and piping hot sambar.',
        image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=60',
        category: 'Breakfast',
        ingredients: ['Rice', 'Lentils', 'Potato', 'Onion', 'Spices', 'Ghee'],
        price: 50,
        availability: true,
      },
      {
        name: 'Idli Vada Combo',
        description: 'Two soft steamed rice cakes (idli) and one crispy deep-fried lentil fritter (vada) served with chutney and sambar.',
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=60',
        category: 'Breakfast',
        ingredients: ['Rice', 'Urad Dal', 'Spices', 'Curry Leaves'],
        price: 40,
        availability: true,
      },
      {
        name: 'Indori Poha',
        description: 'Flattened rice seasoned with turmeric, mustard seeds, onions, topped with pomegranate and crispy sev.',
        image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=60',
        category: 'Breakfast',
        ingredients: ['Poha (Flattened Rice)', 'Onion', 'Turmeric', 'Sev', 'Peanuts'],
        price: 30,
        availability: true,
      },
      // Lunch
      {
        name: 'Chicken Fried Rice',
        description: 'Fluffy wok-tossed basmati rice with seasoned chicken bits, scrambled eggs, and fresh bell peppers.',
        image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=60',
        category: 'Lunch',
        ingredients: ['Basmati Rice', 'Chicken', 'Egg', 'Spring Onion', 'Soy Sauce', 'Garlic'],
        price: 110,
        availability: true,
      },
      {
        name: 'Premium Veg Thali',
        description: 'A complete lunch platter including paneer sabzi, dal fry, dry veg of the day, 2 chapatis, rice, papad, and raita.',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=60',
        category: 'Lunch',
        ingredients: ['Wheat Flour', 'Basmati Rice', 'Paneer', 'Dal', 'Curd', 'Assorted Vegetables'],
        price: 90,
        availability: true,
      },
      {
        name: 'Paneer Butter Masala',
        description: 'Soft cottage cheese cubes cooked in a rich, creamy tomato-cashew onion gravy.',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=60',
        category: 'Lunch',
        ingredients: ['Paneer', 'Butter', 'Tomato', 'Cream', 'Cashews', 'Kasturi Methi'],
        price: 100,
        availability: true,
      },
      // Dinner
      {
        name: 'Hyderabadi Egg Biryani',
        description: 'Fragrant basmati rice layered with boiled eggs, caramelized onions, and spices, slow-cooked in dum style.',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=60',
        category: 'Dinner',
        ingredients: ['Basmati Rice', 'Eggs', 'Yogurt', 'Mint', 'Biryani Spices', 'Saffron'],
        price: 100,
        availability: true,
      },
      {
        name: 'Dal Khichdi Tadka',
        description: 'Comforting, wholesome blend of rice and yellow lentils cooked with ghee and topped with a fiery garlic tadka.',
        image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=60',
        category: 'Dinner',
        ingredients: ['Moong Dal', 'Rice', 'Ghee', 'Garlic', 'Mustard Seeds', 'Cumin'],
        price: 70,
        availability: true,
      },
      {
        name: 'Chapati & Veg Kurma',
        description: 'Three soft wheat chapatis served with a creamy mixed vegetable curry cooked in coconut-poppy seed paste.',
        image: 'https://images.unsplash.com/photo-1627834377411-8da5f4f09de8?w=600&auto=format&fit=crop&q=60',
        category: 'Dinner',
        ingredients: ['Wheat Flour', 'Beans', 'Carrots', 'Potatoes', 'Coconut Paste'],
        price: 60,
        availability: true,
      },
      // Snacks
      {
        name: 'Samosa (Plate of 2)',
        description: 'Crispy golden triangular pastries stuffed with a savory potato and pea mixture, served with sweet tamarind chutney.',
        image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=60',
        category: 'Snacks',
        ingredients: ['All-purpose Flour', 'Potatoes', 'Green Peas', 'Spices', 'Sweet Chutney'],
        price: 25,
        availability: true,
      },
      {
        name: 'Classic Grilled Sandwich',
        description: 'Butter-toasted bread layers filled with sliced cucumber, tomatoes, potatoes, onions, and spicy green mint chutney.',
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=60',
        category: 'Snacks',
        ingredients: ['Bread', 'Butter', 'Green Chutney', 'Cucumber', 'Tomato', 'Cheese'],
        price: 50,
        availability: true,
      },
      {
        name: 'Crispy French Fries',
        description: 'Salted, golden potato fingers fried to crisp perfection, served with sweet chili sauce.',
        image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=600&auto=format&fit=crop&q=60',
        category: 'Snacks',
        ingredients: ['Potato', 'Salt', 'Oil'],
        price: 45,
        availability: true,
      },
      // Beverages
      {
        name: 'Adrak Elaichi Masala Chai',
        description: 'Refreshing hot milk tea brewed with crushed ginger, green cardamom pods, and strong Assam tea leaves.',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=60',
        category: 'Beverages',
        ingredients: ['Milk', 'Tea Leaves', 'Ginger', 'Cardamom', 'Sugar'],
        price: 15,
        availability: true,
      },
      {
        name: 'South Indian Filter Coffee',
        description: 'Chicory-blended coffee decoction frothed up with boiling milk and served in a traditional brass cup.',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=60',
        category: 'Beverages',
        ingredients: ['Filter Coffee Powder', 'Milk', 'Sugar'],
        price: 20,
        availability: true,
      },
      {
        name: 'Mango Lassi',
        description: 'Thick, creamy yogurt drink blended with sweet Alphonso mango pulp and garnished with saffron strands.',
        image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=60',
        category: 'Beverages',
        ingredients: ['Yogurt', 'Mango Pulp', 'Sugar', 'Saffron'],
        price: 35,
        availability: true,
      },
      {
        name: 'Fresh Orange Juice',
        description: 'Freshly squeezed citrus oranges served chilled without added artificial flavors.',
        image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=60',
        category: 'Beverages',
        ingredients: ['Oranges', 'Ice', 'Mint Leaf'],
        price: 40,
        availability: true,
      },
    ];

    const seededFoodItems = await FoodItem.insertMany(foodItemsData);
    console.log(`${seededFoodItems.length} food items seeded.`);

    // 3. Seed Historical Orders and Feedbacks for the last 7 days
    console.log('Seeding historical transactions & reviews...');
    const students = [student, student2, student3];
    const statuses = ['Completed', 'Completed', 'Completed', 'Cancelled', 'Completed'];
    const paymentMethods = ['Razorpay UPI', 'Card Payment', 'Cash On Pickup'];

    const dates = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    // Array of review texts to pick from based on rating
    const positiveComments = [
      'Amazing food! Dosa was super crispy.',
      'Loved the paneer, very creamy and fresh.',
      'Lassi was extremely thick and refreshing.',
      'Samosa was nice and hot. Delivery was quick.',
      'Great hygiene and polite staff.',
      'Excellent taste, value for money!'
    ];

    const neutralComments = [
      'Food is fine, but waiting time is slightly high.',
      'A bit too spicy, but portion size is good.',
      'Could be cleaner around tables, food taste is okay.',
      'Decent sandwich. Average packaging.',
      'Okay tea, could use less sugar.'
    ];

    const negativeComments = [
      'Very slow preparation. Waited 30 minutes!',
      'Food was served cold. Curry was extremely spicy.',
      'Disappointed with quantity. Thali portions are tiny.',
      'Hygiene needs massive improvement. Saw flies.',
      'Overpriced for the taste. Paneer was rubbery.'
    ];

    // Seed orders over the last 7 days
    let orderCountTotal = 0;
    for (const date of dates) {
      // Determine number of orders for this day (10 to 20 to make charts look realistic)
      const isToday = date.toDateString() === new Date().toDateString();
      const dailyOrderCount = isToday ? 5 : Math.floor(10 + Math.random() * 15);

      for (let j = 0; j < dailyOrderCount; j++) {
        orderCountTotal++;
        const selectedStudent = students[Math.floor(Math.random() * students.length)];
        const orderStatus = isToday && j < 2 ? 'Pending' : (isToday && j === 2 ? 'Preparing' : statuses[Math.floor(Math.random() * statuses.length)]);
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const paymentStatus = orderStatus === 'Cancelled' 
          ? (paymentMethod === 'Cash On Pickup' ? 'Pending' : 'Refunded')
          : (orderStatus === 'Completed' ? 'Paid' : (paymentMethod === 'Cash On Pickup' ? 'Pending' : 'Paid'));

        // Pick 1-3 random food items
        const itemCount = Math.floor(1 + Math.random() * 3);
        const orderItems = [];
        let totalAmount = 0;

        // Shuffle food items to pick unique ones
        const shuffledFoods = [...seededFoodItems].sort(() => 0.5 - Math.random());
        for (let k = 0; k < itemCount; k++) {
          const food = shuffledFoods[k];
          const qty = Math.floor(1 + Math.random() * 2);
          orderItems.push({
            foodId: food._id,
            name: food.name,
            image: food.image,
            quantity: qty,
            price: food.price
          });
          totalAmount += food.price * qty;
        }

        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const tokenNumber = `CNT-${randomNum}`;

        const pickupDate = new Date(date);
        pickupDate.setMinutes(pickupDate.getMinutes() + 20);
        const pickupTime = pickupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Save order with custom date
        const order = new Order({
          userId: selectedStudent._id,
          items: orderItems,
          totalAmount,
          paymentMethod,
          paymentStatus,
          status: orderStatus,
          tokenNumber,
          pickupTime,
          createdAt: date
        });

        const savedOrder = await order.save();

        // Save payment
        const transSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
        await Payment.create({
          orderId: savedOrder._id,
          amount: totalAmount,
          paymentMethod,
          paymentStatus,
          transactionId: paymentMethod === 'Cash On Pickup' ? `COP-${transSuffix}` : `TXN-${transSuffix}`,
          createdAt: date
        });

        // Submit Feedback for most completed orders
        if (orderStatus === 'Completed' && (isToday || Math.random() > 0.15)) {
          // Generate realistic ratings
          // We will skew it slightly positive (e.g. 3, 4, 5 stars)
          const baseRating = Math.floor(3 + Math.random() * 3); // 3, 4, 5
          const taste = Math.min(5, Math.max(1, baseRating + Math.floor(Math.random() * 3) - 1));
          const quantity = Math.min(5, Math.max(1, baseRating + Math.floor(Math.random() * 3) - 1));
          const hygiene = Math.min(5, Math.max(1, baseRating + Math.floor(Math.random() * 3) - 1));
          const priceRating = Math.min(5, Math.max(1, baseRating + Math.floor(Math.random() * 3) - 1));
          const service = Math.min(5, Math.max(1, baseRating + Math.floor(Math.random() * 3) - 1));

          const avg = (taste + quantity + hygiene + priceRating + service) / 5;
          let comment = '';
          let complaints = '';
          let suggestions = '';
          let sentiment = 'Neutral';

          if (avg >= 4.0) {
            comment = positiveComments[Math.floor(Math.random() * positiveComments.length)];
            sentiment = 'Positive';
          } else if (avg <= 2.8) {
            comment = negativeComments[Math.floor(Math.random() * negativeComments.length)];
            complaints = comment.includes('slow') || comment.includes('wait') ? 'Long queue lines' : (comment.includes('spicy') ? 'Spicy curry' : 'Portions are small');
            suggestions = comment.includes('slow') ? 'Hire more staff' : 'Make mild dishes';
            sentiment = 'Negative';
          } else {
            comment = neutralComments[Math.floor(Math.random() * neutralComments.length)];
            sentiment = 'Neutral';
          }

          const fb = await Feedback.create({
            userId: selectedStudent._id,
            orderId: savedOrder._id,
            taste,
            quantity,
            hygiene,
            priceRating,
            service,
            comment,
            suggestions,
            complaints,
            sentiment,
            createdAt: date
          });

          // Also push reviews onto the Food Items
          for (const item of orderItems) {
            await FoodItem.findByIdAndUpdate(item.foodId, {
              $push: {
                reviews: {
                  userId: selectedStudent._id,
                  userName: selectedStudent.name,
                  rating: Math.round(avg),
                  comment: comment,
                  createdAt: date
                }
              }
            });
          }
        }
      }
    }

    console.log(`Seeded ${orderCountTotal} orders and associated payments & reviews.`);

    // 4. Update the average rating for all food items based on seeded reviews
    console.log('Recalculating food item rating averages...');
    const allFoods = await FoodItem.find({});
    for (const food of allFoods) {
      if (food.reviews.length > 0) {
        const sum = food.reviews.reduce((acc, r) => acc + r.rating, 0);
        food.rating = Number((sum / food.reviews.length).toFixed(1));
        await food.save();
      }
    }

    // 5. Generate daily summaries for the past 6 days (excluding today)
    console.log('Compiling historical Daily Summaries...');
    for (let i = 6; i >= 1; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];

      const start = new Date(targetDate);
      start.setHours(0,0,0,0);
      const end = new Date(targetDate);
      end.setHours(23,59,59,999);

      const dayOrders = await Order.find({ createdAt: { $gte: start, $lte: end } });
      const dayFeedbacks = await Feedback.find({ createdAt: { $gte: start, $lte: end } });

      const ordersToday = dayOrders.length;
      const revenue = dayOrders
        .filter(o => o.paymentStatus === 'Paid')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      // Most ordered
      let mostPopular = 'Chicken Fried Rice';
      let leastPopular = 'Chapati & Veg Kurma';
      if (dayOrders.length > 0) {
        const counts = {};
        dayOrders.forEach(o => o.items.forEach(itm => counts[itm.name] = (counts[itm.name] || 0) + itm.quantity));
        const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
        if (sorted.length > 0) mostPopular = sorted[0][0];
        if (sorted.length > 1) leastPopular = sorted[sorted.length-1][0];
      }

      let avgRating = 4.0;
      if (dayFeedbacks.length > 0) {
        const sum = dayFeedbacks.reduce((acc, f) => acc + (f.taste + f.quantity + f.hygiene + f.priceRating + f.service) / 5, 0);
        avgRating = Number((sum / dayFeedbacks.length).toFixed(1));
      }

      const complaintCount = dayFeedbacks.filter(f => f.complaints && f.complaints.trim().length > 0).length;
      const complaintPercentage = dayFeedbacks.length > 0 ? Number(((complaintCount / dayFeedbacks.length) * 100).toFixed(1)) : 0;

      // Mock summaries text
      const summaryText = `Daily mess report for ${dateStr}. Total of ${ordersToday} orders processed successfully. Overall dining feedback average stands at ${avgRating} stars across categories. The highest ordering peak occurred at standard lunch hours. Popular request was ${mostPopular}. Complaints mostly noted waiting times.`;
      
      const suggestionsText = [
        'Implement express pick-up line for online pre-orders.',
        `Revise cooking recipe for ${leastPopular} to boost popularity.`,
        'Regular kitchen cleaning inspection schedules.'
      ].join('\n');

      await DailySummary.create({
        date: dateStr,
        summary: summaryText,
        recommendations: suggestionsText,
        metadata: {
          ordersToday,
          revenue,
          mostPopular,
          leastPopular,
          complaintPercentage,
          averageRating: avgRating,
        },
        createdAt: targetDate
      });
    }

    console.log('Seeding completed successfully!');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedData();
