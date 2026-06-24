const Settings = require('../models/Settings');

// @desc    Get payment settings
// @route   GET /api/settings/payment
// @access  Private
exports.getPaymentSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'payment' });
    if (!settings) {
      // Return default settings if not seeded yet
      return res.json({
        upiId: 'canteen@okicici',
        payeeName: 'College Canteen',
        notePrefix: 'CC'
      });
    }
    res.json(settings.value);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving settings', error: error.message });
  }
};

// @desc    Update payment settings
// @route   PUT /api/settings/payment
// @access  Private/Admin
exports.updatePaymentSettings = async (req, res) => {
  try {
    const { upiId, payeeName, notePrefix } = req.body;

    if (!upiId || !payeeName) {
      return res.status(400).json({ message: 'UPI ID and Payee Name are required.' });
    }

    let settings = await Settings.findOne({ key: 'payment' });
    if (!settings) {
      settings = new Settings({
        key: 'payment',
        value: { upiId, payeeName, notePrefix: notePrefix || 'CC' }
      });
    } else {
      settings.value = {
        upiId,
        payeeName,
        notePrefix: notePrefix || 'CC'
      };
    }

    await settings.save();
    res.json({ message: 'Payment settings updated successfully.', settings: settings.value });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating settings', error: error.message });
  }
};
