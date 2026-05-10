const { getPool } = require('../lib/db');
const { verifyToken, setCors } = require('../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try { verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const pool = getPool();
  try {
    const results = await Promise.all([
      pool.query("UPDATE peserta SET golongan = 'PENATA MUDA III/A' WHERE golongan ILIKE '%PENATA III/A%' OR golongan ILIKE '%PENATA MUDAH%' OR golongan ILIKE '%PENATA MUDAH III/A%'"),
      pool.query("UPDATE peserta SET golongan = 'PENGATUR II/C' WHERE golongan ILIKE '%PENGATUR II/C%' OR golongan ILIKE '%PENGATUR  II/C%'"),
      pool.query('SELECT COUNT(*) AS total FROM peserta'),
      pool.query('SELECT gelombang, COUNT(*) AS jumlah FROM peserta GROUP BY gelombang ORDER BY gelombang'),
      pool.query('SELECT golongan, COUNT(*) AS jumlah FROM peserta GROUP BY golongan'),
      pool.query('SELECT jenis_dokumen, COUNT(*) AS jumlah FROM dokumen GROUP BY jenis_dokumen')
    ]);
    res.json({
      totalPeserta: parseInt(results[2].rows[0].total),
      totalAngkatan: 26,
      totalGelombang: 7,
      byGelombang: results[3].rows,
      byGolongan: results[4].rows,
      docsCount: results[5].rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
