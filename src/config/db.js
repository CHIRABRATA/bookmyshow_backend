const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Create the connection pool targeting the Supabase Transaction Pooler (Port 6543)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '6543', 10),
  max: 10, // Maximum active clients allowed in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

// Export the query helper method cleanly
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};