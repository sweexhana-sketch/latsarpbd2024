const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'simlatsar_pbd_2026_secret';

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth) throw new Error('No token');
  return jwt.verify(auth.split(' ')[1], SECRET);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

module.exports = { verifyToken, setCors, SECRET };
