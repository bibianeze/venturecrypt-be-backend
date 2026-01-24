// routes/investment.js - ORIGINAL SIMPLE VERSION (NO BALANCE CHECKS)
const express = require('express');
const Investment = require('../models/Investment');
const InvestmentPlan = require('../models/InvestmentPlan');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ==================== MIDDLEWARE ====================

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Calculate user's investment tier
const calculateUserTier = (totalInvested) => {
  if (totalInvested >= 5000000) return 3; // $5M+ = Tier 3
  if (totalInvested >= 1000000) return 2; // $1M+ = Tier 2
  return 1; // Below $1M = Tier 1
};

// Calculate weekly compounding returns
const calculateWeeklyReturns = (initialAmount, weeklyRate, weeks) => {
  let currentValue = initialAmount;
  const returns = [];
  
  for (let week = 1; week <= weeks; week++) {
    const returnAmount = currentValue * (weeklyRate / 100);
    currentValue += returnAmount;
    returns.push({
      week,
      returnAmount: Math.round(returnAmount * 100) / 100,
      newValue: Math.round(currentValue * 100) / 100
    });
  }
  
  return {
    weeklyReturns: returns,
    finalValue: Math.round(currentValue * 100) / 100,
    totalProfit: Math.round((currentValue - initialAmount) * 100) / 100
  };
};

// ==================== USER INVESTMENTS ====================

// GET all active investment plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await InvestmentPlan.find({ isActive: true }).sort({ minimumAmount: 1 });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET single investment plan
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await InvestmentPlan.findById(req.params.id);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Plan not found or inactive' });
    }
    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE new investment - ORIGINAL SIMPLE VERSION
router.post('/invest', authenticateUser, async (req, res) => {
  try {
    const { planId, amount, transactionProof } = req.body;

    if (!planId || !amount) {
      return res.status(400).json({ message: 'Plan and amount are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const plan = await InvestmentPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Investment plan not found or inactive' });
    }

    if (amount < plan.minimumAmount) {
      return res.status(400).json({ 
        message: `Minimum investment for ${plan.name} is $${plan.minimumAmount.toLocaleString()}` 
      });
    }
    if (plan.maximumAmount && amount > plan.maximumAmount) {
      return res.status(400).json({ 
        message: `Maximum investment for ${plan.name} is $${plan.maximumAmount.toLocaleString()}` 
      });
    }

    // Calculate expected returns
    const { weeklyReturns, finalValue, totalProfit } = calculateWeeklyReturns(
      amount,
      plan.weeklyReturnPercentage,
      plan.weeksCount
    );

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000);

    // Just create the investment - NO balance checks, NO automatic updates
    const investment = new Investment({
      user: user._id,
      plan: planId,
      amount,
      currentValue: amount,
      planSnapshot: {
        name: plan.name,
        tier: plan.tier,
        duration: plan.duration,
        weeklyReturnPercentage: plan.weeklyReturnPercentage,
        weeksCount: plan.weeksCount
      },
      startDate,
      endDate,
      totalProfit,
      finalReturn: finalValue,
      transactionProof,
      status: 'pending'
    });

    await investment.save();

    console.log(`User ${user.email} requested investment of $${amount} in ${plan.name}`);

    res.status(201).json({
      message: 'Investment request submitted. Waiting for admin approval.',
      investment: {
        id: investment._id,
        amount,
        plan: plan.name,
        tier: plan.tier,
        duration: plan.duration,
        weeklyReturnPercentage: plan.weeklyReturnPercentage,
        expectedReturns: weeklyReturns,
        finalReturn: finalValue,
        totalProfit,
        status: investment.status,
        endDate
      }
    });
  } catch (error) {
    console.error('Investment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user's investments
router.get('/my-investments', authenticateUser, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user.userId })
      .populate('plan')
      .sort({ createdAt: -1 });

    res.json(investments);
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user's dashboard stats - SIMPLE VERSION
router.get('/dashboard-stats', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const investments = await Investment.find({ user: req.user.userId });

    const activeInvestments = investments.filter(inv => inv.status === 'active');
    const completedInvestments = investments.filter(inv => inv.status === 'completed');
    const pendingInvestments = investments.filter(inv => inv.status === 'pending');

    // Simple calculation - just sum up amounts
    const totalInvested = investments
      .filter(inv => ['active', 'completed'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate current portfolio value
    const portfolioValue = activeInvestments.reduce((sum, inv) => sum + (inv.currentValue || inv.amount), 0);

    // Calculate user tier
    const userTier = calculateUserTier(totalInvested);

    res.json({
      balance: user.balance || 0,
      totalInvested,
      totalEarned: user.totalEarnings || 0, // Just use what admin sets
      portfolioValue,
      activeInvestments: activeInvestments.length,
      completedInvestments: completedInvestments.length,
      pendingInvestments: pendingInvestments.length,
      userTier,
      canWithdraw: userTier >= 3
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== WITHDRAWAL ROUTES ====================

// REQUEST withdrawal
router.post('/withdraw', authenticateUser, async (req, res) => {
  try {
    const { amount, withdrawalMethod, withdrawalAddress } = req.body;

    if (!amount || !withdrawalMethod || !withdrawalAddress) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const investments = await Investment.find({ 
      user: req.user.userId,
      status: { $in: ['active', 'completed'] }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const userTier = calculateUserTier(totalInvested);

    // Check if user is eligible to withdraw
    if (userTier < 3) {
      return res.status(403).json({
        message: 'Withdrawal not available',
        tier: userTier,
        totalInvested,
        requiredForNextTier: userTier === 1 ? 1000000 : 5000000,
        eligible: false
      });
    }

    // Check if user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const withdrawal = new Withdrawal({
      user: user._id,
      amount,
      withdrawalMethod,
      withdrawalAddress,
      userTier,
      isEligible: true,
      status: 'pending'
    });

    await withdrawal.save();

    res.status(201).json({
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal._id,
        amount,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user's withdrawal history
router.get('/my-withdrawals', authenticateUser, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CHECK withdrawal eligibility
router.get('/withdrawal-eligibility', authenticateUser, async (req, res) => {
  try {
    const investments = await Investment.find({ 
      user: req.user.userId,
      status: { $in: ['active', 'completed'] }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const userTier = calculateUserTier(totalInvested);

    res.json({
      eligible: userTier >= 3,
      tier: userTier,
      totalInvested,
      tierRequirements: {
        tier1: { min: 0, max: 999999, label: 'Tier 1 - Building' },
        tier2: { min: 1000000, max: 4999999, label: 'Tier 2 - Growing' },
        tier3: { min: 5000000, max: null, label: 'Tier 3 - Elite (Withdrawal Enabled)' }
      },
      nextTierRequirement: userTier === 1 ? 1000000 : userTier === 2 ? 5000000 : null
    });
  } catch (error) {
    console.error('Error checking withdrawal eligibility:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;