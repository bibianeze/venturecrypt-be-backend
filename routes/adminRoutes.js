// routes/adminRoutes.js
// Admin routes for managing your existing investment platform

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import your existing models (adjust paths if needed)
const User = require('../models/User');
const Investment = require('../models/Investment');
const Withdrawal = require('../models/Withdrawal');
const Admin = require('../models/Admin');

// ==================== ADMIN AUTH MIDDLEWARE ====================
const authAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No authentication token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ error: 'Admin not found' });
    if (admin.status === 'suspended') return res.status(401).json({ error: 'Admin account is suspended' });

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired. Please login again' });
    res.status(401).json({ error: 'Please authenticate as admin' });
  }
};

// ==================== ADMIN LOGIN ====================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const admin = new Admin({
      name,
      email,
      password,
      role: 'super-admin',
      status: 'active'
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin account created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating admin' });
  }
});

router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    email = email.trim().toLowerCase();
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    if (admin.status === 'suspended') return res.status(401).json({ error: 'Your account has been suspended' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    admin.lastLogin = new Date();
    await admin.save();

    res.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ==================== ADMIN PROFILE ====================
router.get('/profile', authAdmin, async (req, res) => {
  try {
    res.json({
      admin: {
        id: req.admin._id,
        email: req.admin.email,
        name: req.admin.name,
        role: req.admin.role,
        lastLogin: req.admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// ==================== DASHBOARD STATS ====================
router.get('/stats', authAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });

    const pendingInvestments = await Investment.countDocuments({ status: 'pending' });
    const activeInvestments = await Investment.countDocuments({ status: 'active' });
    const completedInvestments = await Investment.countDocuments({ status: 'completed' });

    const investmentStats = await Investment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $group: { _id: null, totalInvested: { $sum: '$amount' }, totalProfit: { $sum: '$profit' } } }
    ]);

    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const completedWithdrawals = await Withdrawal.countDocuments({ status: 'completed' });

    res.json({
      totalUsers,
      activeUsers,
      pendingInvestments,
      activeInvestments,
      completedInvestments,
      totalInvested: investmentStats[0]?.totalInvested || 0,
      totalProfit: investmentStats[0]?.totalProfit || 0,
      pendingWithdrawals,
      completedWithdrawals
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Error fetching statistics' });
  }
});

// ==================== USER MANAGEMENT ====================
router.get('/users', authAdmin, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) query.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (status && status !== 'all' && status !== 'undefined') query.status = status;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const investmentCount = await Investment.countDocuments({ user: user._id });
        const totalInvested = await Investment.aggregate([
          { $match: { user: user._id } }, 
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        return { 
          ...user.toObject(), 
          investments: investmentCount, 
          totalInvested: totalInvested[0]?.total || 0 
        };
      })
    );

    res.json({ users: usersWithStats, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Get single user details
router.get('/users/:id', authAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const investments = await Investment.find({ user: user._id }).sort({ createdAt: -1 });
    const withdrawals = await Withdrawal.find({ user: user._id }).sort({ createdAt: -1 });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalProfit = investments.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const activeInvestments = investments.filter(inv => inv.status === 'active').length;

    res.json({ 
      user, 
      investments, 
      withdrawals, 
      stats: { 
        totalInvested, 
        totalProfit, 
        activeInvestments, 
        totalInvestments: investments.length, 
        totalWithdrawals: withdrawals.length 
      } 
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
});

// Update user balance
router.post('/users/:id/update-balance', authAdmin, async (req, res) => {
  try {
    const { amount, type, note } = req.body;
    if (!amount || !type) return res.status(400).json({ error: 'Amount and type are required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const previousBalance = user.balance || 0;
    if (type === 'credit') user.balance += numAmount;
    else if (type === 'debit') {
      if (previousBalance < numAmount) return res.status(400).json({ error: 'Insufficient balance' });
      user.balance -= numAmount;
    } else return res.status(400).json({ error: 'Invalid type. Use "credit" or "debit"' });

    await user.save();

    console.log(`Admin ${req.admin.email} ${type}ed $${numAmount} ${type === 'credit' ? 'to' : 'from'} user ${user.email}. Note: ${note || 'N/A'}`);

    res.json({ 
      success: true, 
      message: `Successfully ${type === 'credit' ? 'added' : 'deducted'} $${numAmount}`,
      previousBalance, 
      newBalance: user.balance, 
      user: { 
        id: user._id, 
        name: user.fullName, 
        email: user.email, 
        balance: user.balance 
      } 
    });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ error: 'Error updating balance' });
  }
});

// Update user earnings
router.post('/users/:id/update-earnings', authAdmin, async (req, res) => {
  try {
    const { amount, type, note } = req.body; // type: 'credit' or 'debit'
    
    if (!amount || !type) {
      return res.status(400).json({ error: 'Amount and type are required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const previousEarnings = user.totalEarnings || 0;
    
    if (type === 'credit') {
      user.totalEarnings = previousEarnings + numAmount;
    } else if (type === 'debit') {
      if (previousEarnings < numAmount) {
        return res.status(400).json({ error: 'Insufficient earnings to deduct' });
      }
      user.totalEarnings = previousEarnings - numAmount;
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "credit" or "debit"' });
    }

    await user.save();

    console.log(`Admin ${req.admin.email} ${type}ed $${numAmount} earnings ${type === 'credit' ? 'to' : 'from'} user ${user.email}. Note: ${note || 'N/A'}`);

    res.json({
      success: true,
      message: `Successfully ${type === 'credit' ? 'added' : 'deducted'} $${numAmount} ${type === 'credit' ? 'to' : 'from'} user earnings`,
      previousEarnings,
      newEarnings: user.totalEarnings,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        totalEarnings: user.totalEarnings
      }
    });
  } catch (error) {
    console.error('Update earnings error:', error);
    res.status(500).json({ error: 'Error updating earnings' });
  }
});

// Update user status
router.patch('/users/:id/status', authAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const previousStatus = user.status;
    user.status = status;
    await user.save();

    console.log(`Admin ${req.admin.email} changed user ${user.email} status from ${previousStatus} to ${status}`);
    res.json({ 
      success: true, 
      message: `User ${status} successfully`, 
      user: { 
        id: user._id, 
        name: user.fullName, 
        email: user.email, 
        status: user.status 
      } 
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Error updating user status' });
  }
});

// Delete user
router.delete('/users/:id', authAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const activeInvestments = await Investment.countDocuments({ user: user._id, status: 'active' });
    if (activeInvestments > 0) return res.status(400).json({ error: 'Cannot delete user with active investments.' });

    await User.findByIdAndDelete(req.params.id);
    console.log(`Admin ${req.admin.email} deleted user ${user.email}`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

// ==================== INVESTMENT MANAGEMENT ====================

// Get all investments
router.get('/investments', authAdmin, async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status && status !== 'all' && status !== 'undefined') query.status = status;
    if (userId) query.user = userId;

    const investments = await Investment.find(query)
      .populate('user', 'fullName email')
      .populate('plan', 'name duration returnPercentage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Investment.countDocuments(query);

    // Format investments to match expected structure
    const formattedInvestments = investments.map(inv => ({
      _id: inv._id,
      userId: inv.user, // Map 'user' to 'userId' for frontend compatibility
      plan: inv.planSnapshot?.name || inv.plan?.name || 'Unknown Plan',
      amount: inv.amount,
      profit: inv.profit,
      status: inv.status,
      adminApproved: inv.adminApproved,
      startDate: inv.startDate,
      endDate: inv.endDate,
      createdAt: inv.createdAt,
      approvedAt: inv.approvedAt,
      completedAt: inv.completedAt
    }));

    res.json({
      investments: formattedInvestments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ error: 'Error fetching investments' });
  }
});

// Approve investment (change from pending to active)
router.patch('/investments/:id/approve', authAdmin, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id).populate('user', 'fullName email');
    if (!investment) return res.status(404).json({ error: 'Investment not found' });
    if (investment.status !== 'pending') return res.status(400).json({ error: 'Only pending investments can be approved' });

    investment.status = 'active';
    investment.adminApproved = true;
    investment.approvedAt = new Date();
    await investment.save();

    console.log(`Admin ${req.admin.email} approved investment ${investment._id} for user ${investment.user?.email}`);
    res.json({ success: true, message: 'Investment approved successfully', investment });
  } catch (error) {
    console.error('Approve investment error:', error);
    res.status(500).json({ error: 'Error approving investment' });
  }
});

// Reject investment
router.patch('/investments/:id/reject', authAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const investment = await Investment.findById(req.params.id).populate('user', 'fullName email');
    
    if (!investment) return res.status(404).json({ error: 'Investment not found' });
    if (investment.status !== 'pending') return res.status(400).json({ error: 'Only pending investments can be rejected' });

    investment.status = 'cancelled';
    await investment.save();

    // Refund amount to user balance
    const user = await User.findById(investment.user._id);
    if (user) {
      user.balance = (user.balance || 0) + investment.amount;
      await user.save();
    }

    console.log(`Admin ${req.admin.email} rejected investment ${investment._id} for user ${investment.user?.email}. Reason: ${reason}`);
    res.json({ success: true, message: 'Investment rejected and amount refunded to user', investment });
  } catch (error) {
    console.error('Reject investment error:', error);
    res.status(500).json({ error: 'Error rejecting investment' });
  }
});

// Complete investment (mark as completed and credit profit)
router.patch('/investments/:id/complete', authAdmin, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id).populate('user', 'fullName email');
    if (!investment) return res.status(404).json({ error: 'Investment not found' });
    if (investment.status !== 'active') return res.status(400).json({ error: 'Only active investments can be completed' });

    investment.status = 'completed';
    investment.completedAt = new Date();
    await investment.save();

    // Credit principal + profit to user balance
    const user = await User.findById(investment.user._id);
    if (user) {
      const totalReturn = investment.totalReturn || (investment.amount + (investment.profit || 0));
      user.balance = (user.balance || 0) + totalReturn;
      await user.save();
    }

    const totalCredited = investment.totalReturn || (investment.amount + (investment.profit || 0));
    console.log(`Admin ${req.admin.email} completed investment ${investment._id}. Credited $${totalCredited} to user ${investment.user?.email}`);
    res.json({ success: true, message: 'Investment completed and funds credited to user', investment, totalCredited });
  } catch (error) {
    console.error('Complete investment error:', error);
    res.status(500).json({ error: 'Error completing investment' });
  }
});

// Create investment for user (admin creates)
router.post('/investments/create', authAdmin, async (req, res) => {
  try {
    const { userId, plan, amount, customRate, duration } = req.body;
    if (!userId || !plan || !amount) return res.status(400).json({ error: 'userId, plan, and amount are required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const investmentAmount = parseFloat(amount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (user.balance < investmentAmount) return res.status(400).json({ error: `User has insufficient balance. Current balance: $${user.balance}` });

    user.balance -= investmentAmount;
    await user.save();

    const profitRate = customRate ? parseFloat(customRate) / 100 : 0;
    const profit = investmentAmount * profitRate;
    const durationDays = duration || 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const investment = new Investment({
      user: user._id,
      plan: null,
      amount: investmentAmount,
      profit,
      totalReturn: investmentAmount + profit,
      status: 'active',
      adminApproved: true,
      planSnapshot: {
        name: plan,
        duration: durationDays,
        returnPercentage: customRate || 0
      },
      startDate: new Date(),
      endDate,
      approvedAt: new Date()
    });

    await investment.save();

    console.log(`Admin ${req.admin.email} created investment of $${investmentAmount} for user ${user.email}`);
    res.status(201).json({ success: true, message: 'Investment created successfully', investment });
  } catch (error) {
    console.error('Create investment error:', error);
    res.status(500).json({ error: 'Error creating investment' });
  }
});

// ==================== WITHDRAWAL MANAGEMENT ====================

// Get all withdrawals
router.get('/withdrawals', authAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status && status !== 'all' && status !== 'undefined') query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Withdrawal.countDocuments(query);

    // Format to match expected structure
    const formattedWithdrawals = withdrawals.map(wd => ({
      ...wd.toObject(),
      userId: wd.user
    }));

    res.json({
      withdrawals: formattedWithdrawals,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: 'Error fetching withdrawals' });
  }
});

// Approve withdrawal
router.patch('/withdrawals/:id/approve', authAdmin, async (req, res) => {
  try {
    const { transactionHash } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user', 'fullName email');
    
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Only pending withdrawals can be approved' });

    withdrawal.status = 'completed';
    withdrawal.transactionHash = transactionHash || `TX${Date.now()}`;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.admin._id;
    await withdrawal.save();

    console.log(`Admin ${req.admin.email} approved withdrawal ${withdrawal._id} for user ${withdrawal.user?.email}. TxHash: ${withdrawal.transactionHash}`);
    res.json({ success: true, message: 'Withdrawal approved successfully', withdrawal });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ error: 'Error approving withdrawal' });
  }
});

// Reject withdrawal
router.patch('/withdrawals/:id/reject', authAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user', 'fullName email');
    
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Only pending withdrawals can be rejected' });

    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = reason || 'Rejected by admin';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.admin._id;
    await withdrawal.save();

    // Refund amount to user balance
    const user = await User.findById(withdrawal.user._id);
    if (user) {
      user.balance = (user.balance || 0) + withdrawal.amount;
      await user.save();
    }

    console.log(`Admin ${req.admin.email} rejected withdrawal ${withdrawal._id} for user ${withdrawal.user?.email}. Reason: ${reason}`);
    res.json({ success: true, message: 'Withdrawal rejected and amount refunded to user', withdrawal });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ error: 'Error rejecting withdrawal' });
  }
});

module.exports = router;