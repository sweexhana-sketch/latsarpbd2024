const { getPool } = require('../../lib/db');
const { verifyToken, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const { id } = req.query;
  const pool = getPool();

  if (req.method === 'GET') {
    const r = await pool.query('SELECT * FROM peserta WHERE nip = $1', [id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Peserta tidak ditemukan' });
    return res.json(r.rows[0]);
  }

  if (user.role !== 'admin') return res.status(403).json({ error: 'Akses hanya untuk admin' });

  if (req.method === 'PUT') {
    const { nama, nip, golongan, gelombang, angkatan } = req.body || {};
    await pool.query(
      'UPDATE peserta SET nama=$1,nip=$2,golongan=$3,gelombang=$4,angkatan=$5 WHERE id=$6',
      [nama, nip, golongan, gelombang, angkatan, id]
    );
    return res.json({ message: 'Data peserta diperbarui' });
  }

  if (req.method === 'DELETE') {
    await pool.query('DELETE FROM peserta WHERE id=$1', [id]);
    return res.json({ message: 'Peserta dihapus' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
