// POST /api/upload-url  -> mint a one-time signed URL so the browser can upload a
// large audio/video file DIRECTLY to Supabase Storage (admin only).
// This is how we get around Vercel's small request-size limit for big media.
const { supabase, BUCKETS } = require('../lib/supabase');
const { isAdmin } = require('../lib/auth');

const MEDIA_EXT = new Set(['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.mp4', '.webm', '.mov', '.pdf', '.zip']);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { name } = req.body || {};
    const ext = ('.' + String(name || '').split('.').pop()).toLowerCase();
    if (!MEDIA_EXT.has(ext)) {
      return res.status(400).json({ error: 'Allowed media types: ' + [...MEDIA_EXT].join(', ') });
    }
    const safe = String(name)
      .replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'media';
    const fileName = Date.now() + '-' + safe + ext;

    const { data, error } = await supabase.storage.from(BUCKETS.media)
      .createSignedUploadUrl(fileName);
    if (error) throw error;

    const { data: pub } = supabase.storage.from(BUCKETS.media).getPublicUrl(fileName);
    // The browser PUTs the file to uploadUrl, then the file lives at publicUrl.
    return res.status(200).json({
      ok: true,
      bucket: BUCKETS.media,
      path: data.path,
      token: data.token,
      uploadUrl: data.signedUrl,
      publicUrl: pub.publicUrl
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
