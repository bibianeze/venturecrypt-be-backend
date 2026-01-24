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
  
  // ==================== INVESTMENT AMOUNTS ====================
  
  // Principal amount invested (never changes)
  amount: {
    type: Number,
    required: true
  },
  
  // Current value = principal + accumulated profit so far
  currentValue: {
    type: Number,
    default: function() {
      return this.amount; // Start with principal
    }
  },
  
  // Total profit earned (grows each week)
  profit: {
    type: Number,
    default: 0
  },
  
  // Final total return = principal + all profit (set when completed)
  totalReturn: {
    type: Number,
    default: 0
  },
  
  // ==================== PLAN DETAILS ====================
  
  // Lock the plan details at time of investment
  planSnapshot: {
    name: String,
    tier: String,
    duration: Number,
    weeklyReturnPercentage: Number,
    weeksCount: Number
  },
  
  // ==================== TIMING ====================
  
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // ==================== STATUS ====================
  
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // ==================== WEEKLY TRACKING ====================
  
  weeksCompleted: {
    type: Number,
    default: 0
  },
  
  weeklyReturns: [{
    week: Number,
    returnAmount: Number,      // Profit for this week
    newValue: Number,          // Total value after this week
    processedAt: Date
  }],
  
  // ==================== ADMIN ====================
  
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
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  completedAt: {
    type: Date
  },
  
  // ==================== METADATA ====================
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
investmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual to check if investment is locked (active or pending)
investmentSchema.virtual('isLocked').get(function() {
  return ['pending', 'active'].includes(this.status);
});

module.exports = mongoose.model('Investment', investmentSchema);