require('dotenv').config();
const mongoose = require('mongoose');
const InvestmentPlan = require('./models/InvestmentPlan');

const plans = [
  {
    name: 'Starter Plan',
    tier: 'starter',
    duration: 30, // 30 days (4 weeks)
    minimumAmount: 10000, // $10,000
    maximumAmount: 50000, // $50,000
    weeklyReturnPercentage: 15, // 15% per week
    weeksCount: 4,
    description: 'Perfect for beginners. Earn 15% weekly returns with compounding growth over 4 weeks.'
  },
  {
    name: 'Growth Plan',
    tier: 'growth',
    duration: 30, // 30 days (4 weeks)
    minimumAmount: 50000, // $50,000
    maximumAmount: 150000, // $150,000
    weeklyReturnPercentage: 20, // 20% per week
    weeksCount: 4,
    description: 'Accelerate your wealth. 20% weekly compounding returns for growing portfolios.'
  },
  {
    name: 'Premium Plan',
    tier: 'premium',
    duration: 30, // 30 days (4 weeks)
    minimumAmount: 150000, // $150,000
    maximumAmount: 500000, // $500,000
    weeklyReturnPercentage: 25, // 25% per week
    weeksCount: 4,
    description: 'Elite performance. 25% weekly returns with maximum compounding power.'
  },
  {
    name: 'Elite Plan',
    tier: 'elite',
    duration: 30, // 30 days (4 weeks)
    minimumAmount: 500000, // $500,000
    maximumAmount: null, // No maximum
    weeklyReturnPercentage: 50, // 50% per week
    weeksCount: 4,
    description: 'Ultimate wealth multiplication. 50% weekly returns for high-net-worth investors.'
  }
];

async function seedPlans() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing plans
    console.log('🗑️  Clearing existing plans...');
    await InvestmentPlan.deleteMany({});

    // Insert new plans
    console.log('📝 Creating investment plans...');
    const createdPlans = await InvestmentPlan.insertMany(plans);

    console.log('✅ Successfully created weekly compounding plans:');
    createdPlans.forEach(plan => {
      // Calculate total return after 4 weeks of compounding
      let finalValue = plan.minimumAmount;
      for (let i = 0; i < 4; i++) {
        finalValue += finalValue * (plan.weeklyReturnPercentage / 100);
      }
      const totalReturn = ((finalValue / plan.minimumAmount - 1) * 100).toFixed(1);
      
      console.log(`   - ${plan.name}:`);
      console.log(`     • ${plan.weeklyReturnPercentage}% per week (4 weeks)`);
      console.log(`     • Min: $${plan.minimumAmount.toLocaleString()}${plan.maximumAmount ? `, Max: $${plan.maximumAmount.toLocaleString()}` : ', No Max'}`);
      console.log(`     • Total Return: ~${totalReturn}% after compounding`);
    });

    console.log('\n💡 Example: $10,000 in Starter Plan:');
    let exampleValue = 10000;
    for (let week = 1; week <= 4; week++) {
      exampleValue += exampleValue * 0.15;
      console.log(`   Week ${week}: $${Math.round(exampleValue).toLocaleString()}`);
    }
    console.log(`   Final Value: $${Math.round(exampleValue).toLocaleString()}`);
    console.log(`   Total Profit: $${Math.round(exampleValue - 10000).toLocaleString()}`);

    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans();