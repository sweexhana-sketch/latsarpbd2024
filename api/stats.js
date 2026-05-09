const { getPool } = require('../lib/db');
const { verifyToken, setCors } = require('../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try { verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const pool = getPool();
  try {
    const [total, byGel, byGol] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM peserta'),
      pool.query('SELECT gelombang, COUNT(*) AS jumlah FROM peserta GROUP BY gelombang ORDER BY gelombang'),
      pool.query('SELECT golongan, COUNT(*) AS jumlah FROM peserta GROUP BY golongan')
    ]);
    res.json({
      totalPeserta: parseInt(total.rows[0].total),
      totalAngkatan: 26,
      totalGelombang: 7,
      byGelombang: byGel.rows,
      byGolongan: byGol.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
