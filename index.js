const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const investmentRoutes = require('./routes/investment');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ==================== MIDDLEWARE ====================

// CORS Configuration - FIXED (removed trailing slashes)
app.use(cors({
  origin: [
    'https://venturecrypt-be.vercel.app',     // ✅ NO trailing slash
    'https://www.venturecrypt-be.vercel.app', // ✅ www version
    'http://localhost:3000',                   // Local CRA dev
    'http://localhost:5173'                    // Local Vite dev
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight OPTIONS requests
app.use(cors())

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  next();
});

// ==================== ROUTES ====================

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'VentureCrypt API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      investment: '/api/investment',
      admin: '/api/admin'
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Test route for CORS
app.get('/api/test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/admin', adminRoutes);

// ==================== DATABASE CONNECTION ====================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptoinvest';

console.log('\n🔌 Connecting to MongoDB...');
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.name);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // Exit if database connection fails
  });

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ==================== ERROR HANDLING ====================

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // MongoDB errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🚀 ================================');
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Test CORS: http://localhost:${PORT}/api/test`);
  console.log('================================');
  console.log(`📝 Environment:`, {
    PORT: process.env.PORT || '5000 (default)',
    HAS_MONGODB_URI: !!process.env.MONGODB_URI,
    HAS_JWT_SECRET: !!process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development'
  });
  console.log('================================\n');
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received. Closing server gracefully...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received. Closing server gracefully...');
  mongoose.connection.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});