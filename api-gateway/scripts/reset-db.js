import { query } from '../config/db.js';

async function resetDb() {
  console.log('🔄 Resetting Vaultiq Database...');
  try {
    // Truncate both users and invoices for a completely fresh start
    // Using lowercase 'enterpriseinv' as identified by the diagnostic script
    await query('TRUNCATE TABLE users, enterpriseinv RESTART IDENTITY CASCADE;');
    console.log('✅ Database reset successful! Users and Invoices cleared.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

resetDb();
