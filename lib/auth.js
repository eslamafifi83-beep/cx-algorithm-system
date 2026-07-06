// Admin authentication for the API functions.
// Checks a credential the admin panel sends against the ADMIN_USER / ADMIN_PASSWORD
// environment variables you set in Vercel. Uses a constant-time compare.
const crypto = require('crypto');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function isAdmin(req) {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASSWORD || '';
  if (!pass) return false;

  // Preferred: the admin panel sends "user:password" in the x-admin-key header.
  const key = req.headers['x-admin-key'];
  if (key) {
    const s = String(key);
    const i = s.indexOf(':');
    if (i < 0) return false;
    return safeEqual(s.slice(0, i), user) && safeEqual(s.slice(i + 1), pass);
  }

  // Fallback: standard HTTP Basic Auth header.
  const h = req.headers.authorization || '';
  if (h.startsWith('Basic ')) {
    const dec = Buffer.from(h.slice(6), 'base64').toString('utf8');
    const i = dec.indexOf(':');
    if (i < 0) return false;
    return safeEqual(dec.slice(0, i), user) && safeEqual(dec.slice(i + 1), pass);
  }
  return false;
}

module.exports = { isAdmin };
