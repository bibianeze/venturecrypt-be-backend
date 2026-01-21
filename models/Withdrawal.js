const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  withdrawalMethod: {
    type: String,
    required: true // e.g., 'BTC', 'ETH', 'Bank Transfer'
  },
  withdrawalAddress: {
    type: String,
    required: true // Crypto address or bank details
  },
  userTier: {
    type: Number, // 1, 2, or 3
    required: true
  },
  isEligible: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);