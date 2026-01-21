// backend/scripts/createAdmin.js

require('dotenv').config(); // ✅ Load .env variables
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Use MongoDB URI from .env, fallback to local MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crypto_site';

async function createAdmin() {
  try {
    console.log('\n🚀 Creating Admin Account...\n');
    console.log('Connecting to MongoDB...');

await mongoose.connect(MONGODB_URI);


    console.log('✅ Connected to MongoDB\n');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@cryptoinvest.com' });

    if (existingAdmin) {
      console.log('⚠️  Admin account already exists!');
      console.log('\n📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.name);
      console.log('🔑 Role:', existingAdmin.role);
      console.log('📅 Created:', existingAdmin.createdAt);
      console.log('\n💡 Use these credentials to login:');
      console.log('Email: admin@cryptoinvest.com');
      console.log('Password: Admin@123\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Create new admin
    const admin = new Admin({
      name: 'Super Admin',
      email: 'admin@cryptoinvest.com',
      password: hashedPassword,
      role: 'super-admin',
      status: 'active',
      permissions: [
        'manage_users',
        'manage_investments',
        'manage_withdrawals',
        'manage_transactions',
        'view_reports',
        'manage_settings',
      ],
    });

    await admin.save();

    console.log('✅ ================================');
    console.log('✅ Admin created successfully!');
    console.log('✅ ================================\n');
    console.log('LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@cryptoinvest.com');
    console.log('🔑 Password: Admin@123');
    console.log('👤 Role:     super-admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🌐 Login at: http://localhost:3000/admin/login\n');
    console.log('⚠️  IMPORTANT: Change this password after first login!\n');

    await mongoose.connection.close();
    console.log('👋 Done!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdmin();
