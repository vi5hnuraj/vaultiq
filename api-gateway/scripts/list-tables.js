import { query } from '../config/db.js';

async function listTables() {
  try {
    const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('📋 Existing tables:', res.rows.map(r => r.table_name));
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to list tables:', error);
    process.exit(1);
  }
}

listTables();
