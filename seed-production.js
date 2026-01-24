// seed-production.js
// This script seeds investment plans into your PRODUCTION database
// Run with: node seed-production.js

const mongoose = require('mongoose');
const InvestmentPlan = require('./models/InvestmentPlan');

// 🔴 PRODUCTION MONGODB_URI
const PRODUCTION_MONGODB_URI = 'mongodb+srv://cis_db_user:08153535253@cluster0.snmkegg.mongodb.net/crypto_site?appName=Cluster0';

const plans = [
  {
    name: 'Starter Plan',
    tier: 'starter',
    duration: 30, // 30 days (4 weeks)
    minimumAmount: 10000, // $10,000
    maximumAmount: 50000, // $50,000
    weeklyReturnPercentage: 15, // 15% per week
    weeksCount: 4,
    description: 'Perfect for beginners. Earn 15% weekly returns with compounding growth over 4 weeks.',
    isActive: true
  },
  {
    name: 'Growth Plan',
    tier: 'growth',
    duration: 30, // 30 days (4 weeks)
    minimumAmount: 50000, // $50,000
    maximumAmount: 150000, // $150,000
    weeklyReturnPercentage: 20, // 20% per week
    weeksCount: 4,
    description: 'Accelerate your wealth. 20% weekly compounding returns for growing portfolios.',
    isActive: true
  },
  {
    name: 'Premium Plan',
    tier: 'premium',
    duration: 30, // 30 days (4 weeks)
    minimumAmount: 150000, // $150,000
    maximumAmount: 500000, // $500,000
    weeklyReturnPercentage: 25, // 25% per week
    weeksCount: 4,
    description: 'Elite performance. 25% weekly returns with maximum compounding power.',
    isActive: true
  },
  {
    name: 'Elite Plan',
    tier: 'elite',
    duration: 30, // 30 days (4 weeks)
    minimumAmount: 500000, // $500,000
    maximumAmount: null, // No maximum
    weeklyReturnPercentage: 50, // 50% per week
    weeksCount: 4,
    description: 'Ultimate wealth multiplication. 50% weekly returns for high-net-worth investors.',
    isActive: true
  }
];

async function seedProductionPlans() {
  try {
    if (PRODUCTION_MONGODB_URI === 'PASTE_YOUR_PRODUCTION_MONGODB_URI_HERE') {
      console.error('\n❌ ERROR: Please update the PRODUCTION_MONGODB_URI in this file!');
      console.log('\n📝 Steps:');
      console.log('1. Go to Render Dashboard → venturecrypt-be-backend');
      console.log('2. Click "Environment" in the left sidebar');
      console.log('3. Copy the value of MONGODB_URI');
      console.log('4. Paste it in line 7 of this file (seed-production.js)');
      console.log('5. Run: node seed-production.js\n');
      process.exit(1);
    }

    console.log('\n🔌 Connecting to PRODUCTION MongoDB...');
    console.log('⚠️  WARNING: This will seed data into your PRODUCTION database!');
    
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to PRODUCTION MongoDB');

    // Clear existing plans
    console.log('\n🗑️  Clearing existing plans in PRODUCTION...');
    const deletedCount = await InvestmentPlan.deleteMany({});
    console.log(`   Deleted ${deletedCount.deletedCount} existing plans`);

    // Insert new plans
    console.log('\n📝 Creating investment plans in PRODUCTION...');
    const createdPlans = await InvestmentPlan.insertMany(plans);

    console.log('\n✅ Successfully created weekly compounding plans:');
    createdPlans.forEach(plan => {
      // Calculate total return after 4 weeks of compounding
      let finalValue = plan.minimumAmount;
      for (let i = 0; i < 4; i++) {
        finalValue += finalValue * (plan.weeklyReturnPercentage / 100);
      }
      const totalReturn = ((finalValue / plan.minimumAmount - 1) * 100).toFixed(1);
      
      console.log(`\n   📊 ${plan.name}:`);
      console.log(`      • ${plan.weeklyReturnPercentage}% per week (4 weeks)`);
      console.log(`      • Min: $${plan.minimumAmount.toLocaleString()}${plan.maximumAmount ? `, Max: $${plan.maximumAmount.toLocaleString()}` : ', No Max'}`);
      console.log(`      • Total Return: ~${totalReturn}% after compounding`);
    });

    console.log('\n💡 Example: $10,000 in Starter Plan:');
    let exampleValue = 10000;
    for (let week = 1; week <= 4; week++) {
      exampleValue += exampleValue * 0.15;
      console.log(`   Week ${week}: $${Math.round(exampleValue).toLocaleString()}`);
    }
    console.log(`   Final Value: $${Math.round(exampleValue).toLocaleString()}`);
    console.log(`   Total Profit: $${Math.round(exampleValue - 10000).toLocaleString()}`);

    console.log('\n🎉 PRODUCTION seeding complete!');
    console.log('🚀 Your investment plans are now live on Render!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding PRODUCTION plans:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

// Confirmation check
console.log('\n⚠️  ⚠️  ⚠️  WARNING ⚠️  ⚠️  ⚠️');
console.log('You are about to seed data into your PRODUCTION database!');
console.log('This will DELETE all existing investment plans and create new ones.');
console.log('\nStarting in 3 seconds...\n');

setTimeout(() => {
  seedProductionPlans();
}, 3000);