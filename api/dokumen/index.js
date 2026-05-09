const { getPool } = require('../../lib/db');
const { verifyToken, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try { verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { nip } = req.query;
  const pool = getPool();
  let sql = 'SELECT * FROM dokumen';
  const params = [];
  if (nip) { sql += ' WHERE peserta_nip = $1'; params.push(nip); }
  sql += ' ORDER BY upload_date DESC';

  const result = await pool.query(sql, params);
  res.json(result.rows);
};
