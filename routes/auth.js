const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    console.log('📝 Signup request received:', { email: req.body.email, fullName: req.body.fullName });
    
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    console.log('🔍 Checking if user exists...');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({ message: 'Email already registered' });
    }

    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('👤 Creating new user...');
    const user = new User({
      fullName,
      email,
      password: hashedPassword
    });

    await user.save();
    console.log('✅ User created successfully');

    // Generate JWT token immediately
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Signup successful!');

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ 
      message: 'Server error during signup',
      error: error.message 
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login request received:', { email: req.body.email });
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('🔍 Finding user...');
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('🔒 Checking password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful!');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: error.message 
    });
  }
});

module.exports = router;