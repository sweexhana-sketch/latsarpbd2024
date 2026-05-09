const { getPool } = require('../../lib/db');
const { verifyToken, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  let user;
  try { 
    user = verifyToken(req); 
  } catch { 
    return res.status(401).json({ error: 'Unauthorized' }); 
  }
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nip, email, instansi, no_hp } = req.body;
  if (!nip) return res.status(400).json({ error: 'NIP wajib diisi' });
  
  // Admin can edit anyone, participant can only edit their own
  if (user.role !== 'admin' && user.username !== nip) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const pool = getPool();
  try {
    await pool.query(
      'UPDATE peserta SET email = $1, instansi = $2, no_hp = $3 WHERE nip = $4',
      [email || null, instansi || null, no_hp || null, nip]
    );
    res.json({ message: 'Data diri berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};
