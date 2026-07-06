// GET  /api/content  -> returns the whole site content (public; read by every page)
// POST /api/content  -> saves the whole site content (admin only)
const { supabase } = require('../lib/supabase');
const { isAdmin } = require('../lib/auth');

// First-run seed: the content you already built, bundled with the app.
let seed = {};
try { seed = require('../content.json'); } catch (e) { /* no seed file */ }

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('site_content').select('data').eq('id', 1).maybeSingle();
      if (error) throw error;

      let content = data && data.data;
      if (!content || Object.keys(content).length === 0) {
        // Database is empty on first run — load it with the bundled content.
        await supabase.from('site_content')
          .upsert({ id: 1, data: seed, updated_at: new Date().toISOString() });
        content = seed;
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      return res.status(200).send(JSON.stringify(content));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'Content must be a JSON object' });
      }
      const { error } = await supabase.from('site_content')
        .upsert({ id: 1, data: body, updated_at: new Date().toISOString() });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
