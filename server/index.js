const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, seedData } = require('./database');

const app = express();
const PORT = 3000;
const SECRET = 'simlatsar_pbd_2026_secret';

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
// Serve static files from the project root
app.use(express.static(path.join(__dirname, '../')));

// Initialize DB & seed
seedData();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Token tidak valid atau expired' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Akses hanya untuk admin' });
  next();
}

// ── PUBLIC ROUTES ────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

  db.get(`SELECT * FROM users WHERE username = ?`, [username.trim()], (err, user) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!user) return res.status(401).json({ error: 'Username tidak terdaftar' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Password salah' });

    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  });
});

// ── STATS ────────────────────────────────────────────────────────────────────
app.get('/api/stats', auth, (req, res) => {
  db.get(`SELECT COUNT(*) AS total FROM peserta`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(`SELECT gelombang, COUNT(*) AS jumlah FROM peserta GROUP BY gelombang ORDER BY gelombang`, (err2, byGel) => {
      if (err2) return res.status(500).json({ error: err2.message });

      db.all(`SELECT golongan, COUNT(*) AS jumlah FROM peserta GROUP BY golongan`, (err3, byGol) => {
        if (err3) return res.status(500).json({ error: err3.message });

        res.json({
          totalPeserta: row.total,
          totalAngkatan: 26,
          totalGelombang: 7,
          byGelombang: byGel,
          byGolongan: byGol
        });
      });
    });
  });
});

// ── PESERTA ──────────────────────────────────────────────────────────────────
app.get('/api/peserta', auth, (req, res) => {
  const { q = '', gelombang = '', angkatan = '', golongan = '', limit = 50, offset = 0 } = req.query;
  let sql = `SELECT * FROM peserta WHERE 1=1`;
  const params = [];

  if (q) {
    sql += ` AND (nama LIKE ? OR nip LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }
  if (gelombang) { sql += ` AND gelombang = ?`; params.push(Number(gelombang)); }
  if (angkatan)  { sql += ` AND angkatan = ?`;  params.push(Number(angkatan)); }
  if (golongan)  { sql += ` AND golongan = ?`;  params.push(golongan); }

  // Count
  db.get(sql.replace('SELECT *', 'SELECT COUNT(*) AS total'), params, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });
    sql += ` ORDER BY gelombang, angkatan, id LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    db.all(sql, params, (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ data: rows, total: countRow.total });
    });
  });
});

app.get('/api/peserta/:nip', auth, (req, res) => {
  db.get(`SELECT * FROM peserta WHERE nip = ?`, [req.params.nip], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Peserta tidak ditemukan' });
    res.json(row);
  });
});

app.post('/api/peserta', auth, adminOnly, (req, res) => {
  const { nama, nip, golongan, gelombang, angkatan } = req.body;
  db.run(`INSERT INTO peserta (nama, nip, golongan, gelombang, angkatan) VALUES (?,?,?,?,?)`,
    [nama, nip, golongan, gelombang, angkatan], function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Peserta berhasil ditambahkan' });
    });
});

app.put('/api/peserta/:id', auth, adminOnly, (req, res) => {
  const { nama, nip, golongan, gelombang, angkatan } = req.body;
  db.run(`UPDATE peserta SET nama=?, nip=?, golongan=?, gelombang=?, angkatan=? WHERE id=?`,
    [nama, nip, golongan, gelombang, angkatan, req.params.id], function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ message: 'Data peserta diperbarui' });
    });
});

app.delete('/api/peserta/:id', auth, adminOnly, (req, res) => {
  db.run(`DELETE FROM peserta WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Peserta dihapus' });
  });
});

// ── DOKUMEN ──────────────────────────────────────────────────────────────────
app.get('/api/dokumen', auth, (req, res) => {
  const { nip } = req.query;
  let sql = `SELECT * FROM dokumen`;
  const params = [];
  if (nip) { sql += ` WHERE peserta_nip = ?`; params.push(nip); }
  sql += ` ORDER BY upload_date DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/dokumen/upload', auth, upload.single('file'), (req, res) => {
  const { peserta_nip, jenis_dokumen } = req.body;
  if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

  db.run(`INSERT INTO dokumen (peserta_nip, jenis_dokumen, file_path, status) VALUES (?,?,?,?)`,
    [peserta_nip, jenis_dokumen, req.file.filename, 'uploaded'], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Dokumen berhasil diupload', filename: req.file.filename });
    });
});

// Serve index / SPA fallback
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  console.log(`\n✅  SIMLATSAR Server aktif → http://localhost:${PORT}`);
  console.log(`   Login  : http://localhost:${PORT}/login.html`);
  console.log(`   Dashboard: http://localhost:${PORT}/simlatsar_papua_barat_daya.html\n`);
});
