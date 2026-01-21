// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'investment', 'profit', 'refund', 'bonus', 'fee'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  balanceBefore: {
    type: Number,
    default: 0
  },
  balanceAfter: {
    type: Number,
    default: 0
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  // Related documents
  investmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment'
  },
  withdrawalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Withdrawal'
  },
  // Admin tracking
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedBy: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Generate unique reference
transactionSchema.pre('save', function(next) {
  if (!this.reference) {
    this.reference = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

// Index for faster queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ reference: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;