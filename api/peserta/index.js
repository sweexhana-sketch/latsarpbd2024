const { getPool } = require('../../lib/db');
const { verifyToken, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const pool = getPool();

  // GET — list peserta with filter & pagination
  if (req.method === 'GET') {
    const { q = '', gelombang = '', angkatan = '', golongan = '', limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT * FROM peserta WHERE 1=1';
    const params = [];
    let i = 1;

    if (q) {
      sql += ` AND (nama ILIKE $${i} OR nip ILIKE $${i + 1})`;
      params.push(`%${q}%`, `%${q}%`); i += 2;
    }
    if (gelombang) { sql += ` AND gelombang = $${i}`; params.push(Number(gelombang)); i++; }
    if (angkatan)  { sql += ` AND angkatan = $${i}`;  params.push(Number(angkatan));  i++; }
    if (golongan)  { sql += ` AND golongan = $${i}`;  params.push(golongan);          i++; }

    const countResult = await pool.query(sql.replace('SELECT *', 'SELECT COUNT(*) AS total'), params);
    sql += ` ORDER BY gelombang, angkatan, id LIMIT $${i} OFFSET $${i + 1}`;
    params.push(Number(limit), Number(offset));
    const result = await pool.query(sql, params);
    return res.json({ data: result.rows, total: parseInt(countResult.rows[0].total) });
  }

  // POST — tambah peserta (admin only)
  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Akses hanya untuk admin' });
    const { nama, nip, golongan, gelombang, angkatan } = req.body || {};
    try {
      const r = await pool.query(
        'INSERT INTO peserta (nama,nip,golongan,gelombang,angkatan) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [nama, nip, golongan, gelombang, angkatan]
      );
      return res.status(201).json({ id: r.rows[0].id, message: 'Peserta berhasil ditambahkan' });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
