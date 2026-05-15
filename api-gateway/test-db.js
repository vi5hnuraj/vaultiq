import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  console.log("Testing query...");
  try {
    const res = await pool.query('SELECT * FROM enterpriseInv LIMIT 1');
    console.log("Query success:", res.rows);
  } catch (err) {
    console.error("Query error:", err);
  } finally {
    await pool.end();
  }
}

test();
