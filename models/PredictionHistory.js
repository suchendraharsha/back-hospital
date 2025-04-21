const mongoose = require('mongoose');

const PredictionHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'anonymous',
    index: true, // For faster querying
  },
  inputData: {
    type: Object,
    required: true,
  },
  prediction: {
    type: String,
    required: true,
  },
  modelUsed: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PredictionHistory', PredictionHistorySchema);