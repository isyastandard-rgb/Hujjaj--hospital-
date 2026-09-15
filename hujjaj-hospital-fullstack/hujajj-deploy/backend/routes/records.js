const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_GENDERS = new Set(['Male', 'Female', 'Other']);
const VALID_RESULTS = new Set(['', 'Positive', 'Negative', 'Pending', 'Inconclusive']);
const MAX_LEN = 200; // guards against absurdly large field values

function tooLong(...values) {
  return values.some(v => typeof v === 'string' && v.length > MAX_LEN);
}

// Every route below requires a signed-in staff member — patient data
// should never be readable or writable by an anonymous caller.
router.use(requireAuth);

// GET /api/records?q=search
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const result = q
      ? await pool.query(
          `SELECT * FROM patient_records WHERE id ILIKE $1 OR name ILIKE $1 ORDER BY created_at DESC`,
          [`%${q}%`]
        )
      : await pool.query('SELECT * FROM patient_records ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch records error:', err);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// POST /api/records
router.post('/', async (req, res) => {
  const { id, name, gender, diagnosis, test, result, treatment, remark } = req.body || {};

  if (!id || !name || !gender || !diagnosis) {
    return res.status(400).json({ error: 'id, name, gender, and diagnosis are required' });
  }
  if (!VALID_GENDERS.has(gender)) {
    return res.status(400).json({ error: 'Invalid gender value' });
  }
  if (result && !VALID_RESULTS.has(result)) {
    return res.status(400).json({ error: 'Invalid result value' });
  }
  if (tooLong(id, name, gender, diagnosis, test, result, treatment, remark)) {
    return res.status(400).json({ error: `Fields must be under ${MAX_LEN} characters` });
  }

  try {
    const inserted = await pool.query(
      `INSERT INTO patient_records (id, name, gender, diagnosis, test, result, treatment, remark, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id.trim(), name.trim(), gender, diagnosis.trim(), test || null, result || null, treatment || null, remark || null, req.user.username]
    );
    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Patient number "${id}" already exists` });
    }
    console.error('Create record error:', err);
    res.status(500).json({ error: 'Failed to save record' });
  }
});

// DELETE /api/records/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM patient_records WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error('Delete record error:', err);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

module.exports = router;
