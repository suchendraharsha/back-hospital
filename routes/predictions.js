const express = require('express');
const router = express.Router();
const { savePrediction, getPredictionHistory } = require('../controller/predictions.js');

// @route   POST /api/predictions/save
// @desc    Save user input data, prediction result, and model used
// @access  Public (You might want to make this Private later if only logged-in users should save)
router.post('/save', savePrediction);

// @route   GET /api/predictions/history/:userId
// @desc    Get the prediction history for a specific user
// @access  Public (You might want to make this Private later to only allow users to see their own history)
router.get('/history/:userId', getPredictionHistory);

module.exports = router;