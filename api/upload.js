// POST /api/upload  -> upload an image (admin only). Body: { name, data: "data:image/...;base64,..." }
// Saves to the "uploads" storage bucket and returns a public URL.
const { supabase, BUCKETS } = require('../lib/supabase');
const { isAdmin } = require('../lib/auth');

const EXT = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
  'image/gif': '.gif', 'image/svg+xml': '.svg'
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { name, data } = req.body || {};
    const m = /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,(.+)$/.exec(data || '');
    if (!m) return res.status(400).json({ error: 'Only PNG, JPEG, WEBP, GIF or SVG images are allowed' });
    const mime = m[1];
    const ext = EXT[mime];
    const safe = String(name || 'image')
      .replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'image';
    const fileName = Date.now() + '-' + safe + ext;
    const buf = Buffer.from(m[2], 'base64');

    const { error } = await supabase.storage.from(BUCKETS.images)
      .upload(fileName, buf, { contentType: mime, upsert: false });
    if (error) throw error;

    const { data: pub } = supabase.storage.from(BUCKETS.images).getPublicUrl(fileName);
    return res.status(200).json({ ok: true, path: pub.publicUrl });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
