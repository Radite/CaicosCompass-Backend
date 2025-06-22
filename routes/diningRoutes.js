const express = require('express');
const mongoose = require('mongoose');
const Dining = require('../models/Dining');
const router = express.Router();

// Create a new dining entry
router.post('/', async (req, res) => {
  try {
    const newDining = new Dining(req.body);
    const savedDining = await newDining.save();
    res.status(201).json(savedDining);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create dining entry', details: error.message });
  }
});

// Get all dining entries
router.get('/', async (req, res) => {
  try {
    const diningEntries = await Dining.find();
    res.json(diningEntries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dining entries', details: error.message });
  }
});

// Get a specific dining entry by ID
router.get('/:id', async (req, res) => {
  try {
    const diningEntry = await Dining.findById(req.params.id);
    if (!diningEntry) {
      return res.status(404).json({ error: 'Dining entry not found' });
    }
    res.json(diningEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dining entry', details: error.message });
  }
});

// Update a dining entry by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedDining = await Dining.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedDining) {
      return res.status(404).json({ error: 'Dining entry not found' });
    }
    res.json(updatedDining);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to update dining entry', details: error.message });
  }
});

// Delete a dining entry by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedDining = await Dining.findByIdAndDelete(req.params.id);
    if (!deletedDining) {
      return res.status(404).json({ error: 'Dining entry not found' });
    }
    res.json({ message: 'Dining entry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete dining entry', details: error.message });
  }
});

module.exports = router;
