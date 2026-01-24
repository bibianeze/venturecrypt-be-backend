// migration-add-totalInvested-SIMPLE.js
// Run this script ONCE to add totalInvested field to existing users

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptoinvest';

async function migrateDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Starting migration...\n');

    // Get direct access to collections (bypass model hooks)
    const usersCollection = mongoose.connection.collection('users');
    const investmentsCollection = mongoose.connection.collection('investments');

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to migrate\n`);

    for (const user of users) {
      console.log(`👤 Processing user: ${user.email}`);

      // Get all investments for this user
      const investments = await investmentsCollection.find({
        user: user._id,
        status: { $in: ['pending', 'active', 'completed'] }
      }).toArray();

      // Calculate totalInvested (sum of all investment amounts)
      const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      
      // Calculate totalEarnings (sum of all profits from investments)
      const totalEarnings = investments.reduce((sum, inv) => sum + (inv.profit || 0), 0);

      // Calculate how much should be in balance
      const completedInvestments = investments.filter(inv => inv.status === 'completed');
      const completedTotal = completedInvestments.reduce((sum, inv) => 
        sum + (inv.totalReturn || inv.amount + (inv.profit || 0)), 0
      );

      const activeInvestments = investments.filter(inv => ['pending', 'active'].includes(inv.status));
      const activeTotal = activeInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0);

      // Calculate correct balance
      let calculatedBalance = user.balance || 0;
      
      // If balance is 0 but they should have money from completed investments
      if (calculatedBalance === 0 && completedTotal > 0) {
        calculatedBalance = completedTotal - activeTotal;
      }

      // Update user directly (bypassing model hooks)
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            totalInvested: totalInvested,
            totalEarnings: totalEarnings,
            totalWithdrawn: user.totalWithdrawn || 0,
            balance: calculatedBalance,
            status: user.status || 'active'
          }
        }
      );

      console.log(`  ✅ Updated:`);
      console.log(`     - totalInvested: $${totalInvested.toFixed(2)}`);
      console.log(`     - totalEarnings: $${totalEarnings.toFixed(2)}`);
      console.log(`     - balance: $${calculatedBalance.toFixed(2)}`);
      console.log(`     - ${investments.length} investments found\n`);
    }

    console.log('✅ Migration completed successfully!\n');

    // Display summary
    console.log('📈 SUMMARY:');
    const allUsers = await usersCollection.find({}).toArray();
    const totalBalance = allUsers.reduce((sum, u) => sum + (u.balance || 0), 0);
    const totalInvestedSum = allUsers.reduce((sum, u) => sum + (u.totalInvested || 0), 0);
    const totalEarningsSum = allUsers.reduce((sum, u) => sum + (u.totalEarnings || 0), 0);

    console.log(`   Total Users: ${allUsers.length}`);
    console.log(`   Total Balance: $${totalBalance.toFixed(2)}`);
    console.log(`   Total Invested: $${totalInvestedSum.toFixed(2)}`);
    console.log(`   Total Earnings: $${totalEarningsSum.toFixed(2)}\n`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateDatabase()
  .then(() => {
    console.log('\n✅ All done! You can now use the new fields.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration error:', error);
    process.exit(1);
  });