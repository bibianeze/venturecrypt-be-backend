const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  
  // ==================== BALANCE FIELDS ====================
  
  // Available Balance = money user can withdraw right now
  balance: {
    type: Number,
    default: 0
  },
  
  // Total amount user has ever invested (cumulative, never decreases)
  totalInvested: {
    type: Number,
    default: 0
  },
  
  // Total profit/earnings from all investments (only the profit, not principal)
  totalEarnings: {
    type: Number,
    default: 0
  },
  
  // Total amount user has withdrawn
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  
  // ==================== OTHER FIELDS ====================
  
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active'
  },
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true  // This automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('User', userSchema);