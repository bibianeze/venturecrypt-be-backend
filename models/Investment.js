const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvestmentPlan',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number, // Tracks the growing value each week
    default: 0
  },
  // Lock the plan details at time of investment
  planSnapshot: {
    name: String,
    tier: String,
    duration: Number,
    weeklyReturnPercentage: Number,
    weeksCount: Number
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  weeksCompleted: {
    type: Number,
    default: 0
  },
  weeklyReturns: [{
    week: Number,
    returnAmount: Number,
    newValue: Number,
    processedAt: Date
  }],
  totalProfit: {
    type: Number,
    default: 0
  },
  finalReturn: {
    type: Number, // Final value after all weeks
    default: 0
  },
  transactionProof: {
    type: String,
    default: null
  },
  adminApproved: {
    type: Boolean,
    default: false
  },
  approvedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Investment', investmentSchema);