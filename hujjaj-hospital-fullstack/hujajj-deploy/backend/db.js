const { Pool } = require('pg');

// DATABASE_URL example:
//   postgresql://user:password@host:5432/dbname
// Most managed Postgres hosts (Render, Railway, Supabase, Neon, RDS) give
// you this connection string directly — just paste it into your .env file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Managed providers usually require SSL; DATABASE_SSL=false disables it
  // for local development against a plain Docker/local Postgres instance.
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

module.exports = pool;
