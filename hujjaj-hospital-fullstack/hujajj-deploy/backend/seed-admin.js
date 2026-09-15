require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

(async () => {
  const hash = await bcrypt.hash('admin123', 12);
  await pool.query(
    'INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3) ON CONFLICT (username) DO UPDATE SET password_hash=$2, role=$3',
    ['admin', hash, 'admin']
  );
  console.log('Admin created');
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});