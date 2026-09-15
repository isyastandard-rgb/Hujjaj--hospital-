require('dotenv').config();

// Fail fast and loudly if the app is misconfigured, rather than starting
// up in a broken/insecure state.
if (!process.env.DATABASE_URL) {
  console.error('Missing required environment variable: DATABASE_URL');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Missing or weak JWT_SECRET — set a random string of at least 32 characters in your .env');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const pool = require('./db');
const authRoutes = require('./routes/auth');
const recordsRoutes = require('./routes/records');

const app = express();
const PORT = process.env.PORT || 4000;

// Needed for correct client IPs behind a platform's reverse proxy
// (Render, Railway, Fly, etc.) — otherwise rate limiting keys off the
// proxy's IP instead of the real caller.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// General API rate limit — generous, just a backstop against abuse.
// The login route has its own stricter limiter (see routes/auth.js).
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/records', recordsRoutes);

// 404 for anything else under /api
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Centralized error handler — keeps stack traces out of responses.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Hujajj Hospital API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
