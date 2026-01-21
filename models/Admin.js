// backend/models/Admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
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
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'super-admin', 'moderator'],
    default: 'admin'
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  permissions: [{
    type: String
  }]
}, {
  timestamps: true
});

// ==================== METHODS ====================
// Compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ==================== PRE-SAVE HOOK ====================
// Hash password before saving
adminSchema.pre('save', async function() {
  if (this.isModified('password')) {
    // Mongoose 7+ async hook does not need next()
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

module.exports = mongoose.model('Admin', adminSchema);
