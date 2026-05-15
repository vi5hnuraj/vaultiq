import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout to prevent infinite hangs
});

export const query = (text, params) => {
  console.log("🐘 EXECUTING QUERY:", text.substring(0, 100) + "...");
  return pool.query(text, params);
};

export const initDb = async () => {
  console.log('🔄 Initializing Database...');
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    const createTables = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        wallet_address TEXT UNIQUE NOT NULL,
        role TEXT CHECK(role IN ('investor', 'enterprise')) NOT NULL DEFAULT 'investor'
      );

      CREATE TABLE IF NOT EXISTS enterpriseInv (
        id SERIAL PRIMARY KEY,
        sme_address TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        ipfs_cid TEXT UNIQUE NOT NULL,
        invoice_amount NUMERIC NOT NULL,
        funded_amount NUMERIC,
        preferred_token_symbol TEXT,
        nft_id INTEGER, 
        tx_hash TEXT UNIQUE,
        tx_funded_hash TEXT,
        tx_repaid_hash TEXT,
        investor_pubkey TEXT,
        status TEXT CHECK(status IN ('pending', 'funded', 'repaid')) NOT NULL DEFAULT 'pending',
        due_date TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE enterpriseInv ADD COLUMN IF NOT EXISTS tx_funded_hash TEXT;
      ALTER TABLE enterpriseInv ADD COLUMN IF NOT EXISTS tx_repaid_hash TEXT;
    `;

    await client.query(createTables);
    console.log('✅ Database Tables Verified');
  } catch (err) {
    console.error('❌ Database Initialization Error:', err.message);
  } finally {
    if (client) client.release();
  }
};
initDb();
