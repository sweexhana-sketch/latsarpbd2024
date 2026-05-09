const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const data = JSON.parse(fs.readFileSync('server/participants.json', 'utf8'));
  let c = 0;
  for (let p of data) {
    await pool.query('UPDATE peserta SET nama = $1 WHERE nip = $2', [p[0], p[1]]);
    await pool.query('UPDATE users SET name = $1 WHERE username = $2', [p[0], p[1].replace(/\s+/g, '')]);
    c++;
  }
  console.log('Updated ' + c + ' records.');
  await pool.end();
}
run().catch(console.error);
