const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../lib/db');
const { setCors, SECRET } = require('../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Username dan password wajib diisi' });

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1', [username.trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Username tidak terdaftar' });
    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Password salah' });

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      SECRET, { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
