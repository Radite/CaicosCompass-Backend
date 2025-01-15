const Activity = require('../models/Activity');

// Get all activities
exports.getAllActivities = async (req, res) => {
  try {
    const activities = await Activity.find();
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get specific activity
exports.getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found.' });
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new activity (Admin only)
exports.createActivity = async (req, res) => {
  try {
    const { images } = req.body;

    // Ensure only one main image is set
    if (images && images.filter((img) => img.isMain).length > 1) {
      return res.status(400).json({ error: 'Only one image can be set as the main image.' });
    }

    // Create the new activity
    const newActivity = await Activity.create(req.body);
    res.status(201).json({ success: true, data: newActivity });
  } catch (error) {
    console.error('Error creating activity:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update activity
exports.updateActivity = async (req, res) => {
  try {
    const updatedActivity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete activity
exports.deleteActivity = async (req, res) => {
  try {
    await Activity.findByIdAndDelete(req.params.id);
    res.json({ message: 'Activity deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch active deals
exports.getActiveDeals = async (req, res) => {
  try {
    const activeDeals = await Activity.find({ deals: { $ne: [] } });
    res.json({ data: activeDeals });
  } catch (error) {
    console.error("Error fetching active deals:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Bulk Insert Activities
exports.bulkInsertActivities = async (req, res) => {
  try {
    const activities = req.body;
    const result = await Activity.insertMany(activities);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a suboption to an activity
exports.addSuboption = async (req, res) => {
  try {
    const { id } = req.params;
    const suboption = req.body;

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).json({ message: 'Activity not found.' });

    activity.options.push(suboption);
    await activity.save();

    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a suboption
exports.updateSuboption = async (req, res) => {
  try {
    const { id, optionId } = req.params;
    const updatedData = req.body;

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).json({ message: 'Activity not found.' });

    const suboption = activity.options.id(optionId);
    if (!suboption) return res.status(404).json({ message: 'Suboption not found.' });

    Object.assign(suboption, updatedData);
    await activity.save();

    res.status(200).json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a suboption
exports.deleteSuboption = async (req, res) => {
  try {
    const { id, optionId } = req.params;

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).json({ message: 'Activity not found.' });

    const suboption = activity.options.id(optionId);
    if (!suboption) return res.status(404).json({ message: 'Suboption not found.' });

    suboption.remove();
    await activity.save();

    res.status(200).json({ success: true, message: 'Suboption deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch activities by tag
exports.getActivitiesByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const activities = await Activity.find({ tags: tag });
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch activity filters
exports.getActivityFilters = async (req, res) => {
  try {
    const categories = await Activity.distinct('category');
    const tags = await Activity.distinct('tags');

    res.json({ categories, tags });
  } catch (error) {
    console.error('Error fetching filters:', error.message);
    res.status(500).json({ error: 'Failed to fetch filters.' });
  }
};

// Search activities
exports.searchActivities = async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice } = req.query;
    const filters = {};

    if (query) filters.title = { $regex: query, $options: 'i' };
    if (category) filters.category = category;
    if (minPrice || maxPrice) filters.price = { $gte: minPrice || 0, $lte: maxPrice || Infinity };

    const activities = await Activity.find(filters);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch recommended activities
exports.getRecommended = async (req, res) => {
  try {
    const activities = await Activity.find();
    const recommended = activities.sort(() => 0.5 - Math.random()).slice(0, 10);
    res.json({ success: true, data: recommended });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch recommended activities by category
exports.getRecommendedByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const activities = await Activity.find({ category }).sort(() => 0.5 - Math.random()).slice(0, 10);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
