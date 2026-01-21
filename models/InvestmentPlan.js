const mongoose = require('mongoose');

const investmentPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  tier: {
    type: String,
    enum: ['starter', 'growth', 'premium', 'elite'],
    required: true
  },
  duration: {
    type: Number, // Duration in days (always 30 for all plans)
    required: true,
    default: 30
  },
  minimumAmount: {
    type: Number,
    required: true
  },
  maximumAmount: {
    type: Number,
    default: null // null means no maximum
  },
  weeklyReturnPercentage: {
    type: Number, // Weekly return percentage (15%, 20%, 25%, 50%)
    required: true
  },
  weeksCount: {
    type: Number, // Number of weeks (4 weeks = 1 month)
    default: 4
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('InvestmentPlan', investmentPlanSchema);