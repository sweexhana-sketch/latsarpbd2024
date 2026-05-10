const { getPool } = require('../lib/db');
const { setCors, verifyToken } = require('../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const pool = getPool();

  try {
    // Create table gracefully if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS aduan (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(50),
        nama_pengirim VARCHAR(100),
        topik VARCHAR(100),
        pesan TEXT,
        tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (req.method === 'POST') {
      const { topik, pesan } = req.body || {};
      if (!topik || !pesan) return res.status(400).json({ error: 'Topik dan pesan wajib diisi' });

      await pool.query(
        'INSERT INTO aduan (nip, nama_pengirim, topik, pesan) VALUES ($1, $2, $3, $4)',
        [user.id, user.name, topik, pesan]
      );
      
      return res.json({ success: true, message: 'Pesan berhasil dikirim' });
    }

    if (req.method === 'GET') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
      
      const { rows } = await pool.query('SELECT * FROM aduan ORDER BY id DESC LIMIT 50');
      return res.json({ data: rows });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saat memproses aduan' });
  }
};
