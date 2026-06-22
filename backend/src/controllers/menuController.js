const FoodItem = require('../models/FoodItem');

// @desc    Get all menu items with search, filter, and sort
// @route   GET /api/menu
// @access  Public
exports.getMenuItems = async (req, res) => {
  try {
    const { search, category, availability, sort } = req.query;
    let query = {};

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Availability filter
    if (availability !== undefined) {
      query.availability = availability === 'true';
    }

    // Build query execution
    let itemsQuery = FoodItem.find(query);

    // Sorting
    if (sort) {
      if (sort === 'price_asc') {
        itemsQuery = itemsQuery.sort({ price: 1 });
      } else if (sort === 'price_desc') {
        itemsQuery = itemsQuery.sort({ price: -1 });
      } else if (sort === 'rating') {
        itemsQuery = itemsQuery.sort({ rating: -1 });
      }
    } else {
      // Default sort by rating descending then name
      itemsQuery = itemsQuery.sort({ rating: -1, name: 1 });
    }

    const items = await itemsQuery;
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching menu items' });
  }
};

// @desc    Get single menu item by ID
// @route   GET /api/menu/:id
// @access  Public
exports.getMenuItemById = async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching food item details' });
  }
};

// @desc    Create a new food item
// @route   POST /api/menu
// @access  Private/Admin
exports.createMenuItem = async (req, res) => {
  try {
    const { name, description, image, category, ingredients, price, availability } = req.body;

    const foodItem = new FoodItem({
      name,
      description,
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
      category,
      ingredients: Array.isArray(ingredients) ? ingredients : ingredients.split(',').map(i => i.trim()),
      price,
      availability: availability !== undefined ? availability : true,
    });

    const createdItem = await foodItem.save();
    res.status(201).json(createdItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating food item', error: error.message });
  }
};

// @desc    Update a food item
// @route   PUT /api/menu/:id
// @access  Private/Admin
exports.updateMenuItem = async (req, res) => {
  try {
    const { name, description, image, category, ingredients, price, availability } = req.body;

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    foodItem.name = name || foodItem.name;
    foodItem.description = description || foodItem.description;
    foodItem.image = image || foodItem.image;
    foodItem.category = category || foodItem.category;
    foodItem.price = price !== undefined ? price : foodItem.price;
    foodItem.availability = availability !== undefined ? availability : foodItem.availability;

    if (ingredients) {
      foodItem.ingredients = Array.isArray(ingredients) ? ingredients : ingredients.split(',').map(i => i.trim());
    }

    const updatedItem = await foodItem.save();
    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating food item', error: error.message });
  }
};

// @desc    Delete a food item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
exports.deleteMenuItem = async (req, res) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    await FoodItem.deleteOne({ _id: req.params.id });
    res.json({ message: 'Food item removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting food item' });
  }
};
