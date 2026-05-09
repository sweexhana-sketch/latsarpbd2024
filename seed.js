/**
 * seed.js — Jalankan sekali untuk mengisi database Neon
 * Usage: DATABASE_URL="postgres://..." node seed.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  console.log('🌱 Seeding database...');

  // Admin accounts
  const adminHash = bcrypt.hashSync('admin2026', 10);
  await pool.query(`INSERT INTO users (username,password,name,role) VALUES ($1,$2,$3,$4)
    ON CONFLICT(username) DO UPDATE SET password=EXCLUDED.password`,
    ['admin', adminHash, 'Administrator BKPSDM', 'admin']);
  await pool.query(`INSERT INTO users (username,password,name,role) VALUES ($1,$2,$3,$4)
    ON CONFLICT(username) DO UPDATE SET password=EXCLUDED.password`,
    ['demo', bcrypt.hashSync('demo2026', 10), 'Demo Account', 'admin']);
  console.log('✅ Admin seeded');

  // Peserta from participants.json
  const participantsPath = path.join(__dirname, 'server', 'participants.json');
  if (!fs.existsSync(participantsPath)) {
    console.warn('⚠️  participants.json tidak ditemukan, skip seeding peserta');
    await pool.end();
    return;
  }

  const peserta = JSON.parse(fs.readFileSync(participantsPath, 'utf8'));
  let count = 0;
  for (const p of peserta) {
    const [nama, nip, gol, gel, ang] = p;
    const cleanNip = nip.replace(/\s+/g, '');
    await pool.query(
      `INSERT INTO peserta (nama,nip,golongan,gelombang,angkatan) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(nip) DO NOTHING`,
      [nama, nip, gol, gel, ang]
    );
    await pool.query(
      `INSERT INTO users (username,password,name,role) VALUES ($1,$2,$3,'peserta')
       ON CONFLICT(username) DO NOTHING`,
      [cleanNip, bcrypt.hashSync(cleanNip, 10), nama]
    );
    count++;
  }
  console.log(`✅ ${count} peserta seeded`);
  await pool.end();
  console.log('🎉 Done!');
}

seed().catch(e => { console.error(e); process.exit(1); });
