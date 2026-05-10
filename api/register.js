const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../lib/db');
const { setCors, SECRET } = require('../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nip, email, password } = req.body || {};
  if (!nip || !email || !password) {
    return res.status(400).json({ error: 'NIP, Email, dan Password wajib diisi' });
  }

  const cleanNip = nip.replace(/\s+/g, '');
  const pool = getPool();
  
  try {
    // 1. Check if NIP exists in Master Data Peserta
    const { rows: pesertaRows } = await pool.query('SELECT * FROM peserta WHERE nip = $1', [cleanNip]);
    if (pesertaRows.length === 0) {
      return res.status(404).json({ error: 'NIP tidak ditemukan dalam database LATSAR. Hubungi panitia BPSDM.' });
    }
    const peserta = pesertaRows[0];

    // 2. Hash the new password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // 3. Create or Update user account
    const { rows: userRows } = await pool.query('SELECT * FROM users WHERE username = $1', [cleanNip]);
    if (userRows.length > 0) {
      // If account already exists (from seed), just update their password to the new one during this "registration"
      await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, cleanNip]);
    } else {
      // Insert new user account, name is automatically pulled from peserta database!
      await pool.query(
        'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)',
        [cleanNip, hashedPassword, peserta.nama, 'peserta']
      );
    }

    // 4. Save their active email to the peserta table
    await pool.query('UPDATE peserta SET email = $1 WHERE nip = $2', [email, cleanNip]);

    // 5. Automatically log them in by returning a token
    const token = jwt.sign(
      { id: cleanNip, username: cleanNip, name: peserta.nama, role: 'peserta' },
      SECRET, { expiresIn: '8h' }
    );

    res.json({ 
      message: 'Registrasi berhasil',
      token, 
      user: { id: cleanNip, username: cleanNip, name: peserta.nama, role: 'peserta' } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saat registrasi' });
  }
};
