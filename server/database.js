const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const participantsPath = path.resolve(__dirname, 'participants.json');
let ALL_PESERTA = [];
try {
    if (fs.existsSync(participantsPath)) {
        const rawData = fs.readFileSync(participantsPath, 'utf8');
        ALL_PESERTA = JSON.parse(rawData);
    }
} catch (err) {
    console.error('[DB] Failed to load participants.json:', err.message);
}

function seedData() {
  db.serialize(() => {
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'viewer'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS peserta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      nip TEXT UNIQUE NOT NULL,
      golongan TEXT NOT NULL,
      gelombang INTEGER NOT NULL,
      angkatan INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dokumen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peserta_nip TEXT NOT NULL,
      jenis_dokumen TEXT NOT NULL,
      file_path TEXT,
      status TEXT DEFAULT 'pending',
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(peserta_nip) REFERENCES peserta(nip)
    )`);

    // Force update admin password to ensure it's admin2026
    const adminHash = bcrypt.hashSync('admin2026', 10);
    db.run(`INSERT INTO users (username, password, name, role) VALUES (?,?,?,?) 
            ON CONFLICT(username) DO UPDATE SET password=excluded.password`,
      ['admin', adminHash, 'Administrator BKPSDM', 'admin']);
    
    // Also add 'admin2026' as a username alias for convenience
    db.run(`INSERT INTO users (username, password, name, role) VALUES (?,?,?,?) 
            ON CONFLICT(username) DO UPDATE SET password=excluded.password`,
      ['admin2026', adminHash, 'Administrator BKPSDM (Alias)', 'admin']);

    // Seed demo user
    const demoHash = bcrypt.hashSync('demo2026', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?,?,?,?)`,
      ['demo', demoHash, 'Demo Account', 'admin']);

    // Seed peserta and their accounts
    const stmt = db.prepare(`INSERT OR IGNORE INTO peserta (nama, nip, golongan, gelombang, angkatan) VALUES (?,?,?,?,?)`);
    const userStmt = db.prepare(`INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?,?,?,?)`);

    ALL_PESERTA.forEach((p) => {
      const [nama, nip, gol, gel, ang] = p;
      stmt.run(nama, nip, gol, gel, ang);
      
      // Create user account for each participant (username=NIP, password=NIP)
      const cleanNip = nip.replace(/\s+/g, '');
      const hashedNip = bcrypt.hashSync(cleanNip, 10);
      userStmt.run(cleanNip, hashedNip, nama, 'peserta');
    });

    stmt.finalize();
    userStmt.finalize();

    console.log(`[DB] Initialized & seeded ${ALL_PESERTA.length} peserta.`);
  });
}

module.exports = { db, seedData };
