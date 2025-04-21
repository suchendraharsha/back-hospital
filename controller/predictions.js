const PredictionHistory = require('../models/PredictionHistory.js');

// @desc    Save user input and prediction
// @route   POST /api/predictions/save
const savePrediction = async (req, res) => {
  try {
    const { inputData, prediction, modelUsed, userId } = req.body;

    const newPrediction = new PredictionHistory({
      userId: userId || 'anonymous',
      inputData: inputData,
      prediction,
      modelUsed,
    });
    console.log('formData in backend:', inputData);
    const savedPrediction = await newPrediction.save();
    res.status(201).json(savedPrediction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get user's prediction history
// @route   GET /api/predictions/history/:userId
const getPredictionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await PredictionHistory.find({ userId }).sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  savePrediction,
  getPredictionHistory,
};