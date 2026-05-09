const { getPool } = require('../../lib/db');
const { verifyToken, setCors } = require('../../lib/auth');
const cloudinary = require('cloudinary').v2;
const formidable = require('formidable');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Disable Vercel's default body parser for multipart
module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try { verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const form = formidable({ maxFileSize: 5 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);

    const peserta_nip   = Array.isArray(fields.peserta_nip)   ? fields.peserta_nip[0]   : fields.peserta_nip;
    const jenis_dokumen = Array.isArray(fields.jenis_dokumen) ? fields.jenis_dokumen[0] : fields.jenis_dokumen;
    const file          = Array.isArray(files.file)           ? files.file[0]            : files.file;

    if (!file) return res.status(400).json({ error: 'File tidak ditemukan' });

    // Upload ke Cloudinary
    const publicId = `simlatsar/${peserta_nip}_${jenis_dokumen}_${Date.now()}`.replace(/[^a-zA-Z0-9_/]/g, '_');
    const upload = await cloudinary.uploader.upload(file.filepath, {
      folder: 'simlatsar-pbd',
      resource_type: 'auto',
      public_id: publicId
    });

    // Simpan ke database
    const pool = getPool();
    const r = await pool.query(
      'INSERT INTO dokumen (peserta_nip,jenis_dokumen,file_path,file_url,status) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [peserta_nip, jenis_dokumen, upload.public_id, upload.secure_url, 'uploaded']
    );

    res.json({ id: r.rows[0].id, message: 'Dokumen berhasil diupload', url: upload.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
