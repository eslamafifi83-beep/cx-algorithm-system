// POST /api/contact  -> saves a contact-form submission (public, rate-limited)
const { supabase } = require('../lib/supabase');

// Best-effort per-instance rate limit (resets when the function cold-starts).
const hits = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (recent.length >= 5) {
    return res.status(429).json({ error: 'Too many messages. Please wait a minute and try again.' });
  }
  recent.push(now);
  hits.set(ip, recent);

  try {
    const b = req.body || {};
    const intent = typeof b.intent === 'string' ? b.intent.slice(0, 32) : '';
    if (typeof b.fields !== 'object' || b.fields === null || Array.isArray(b.fields)) {
      return res.status(400).json({ error: 'Invalid fields' });
    }
    const fields = {};
    let any = false;
    for (const [k, v] of Object.entries(b.fields).slice(0, 20)) {
      if (typeof v !== 'string') continue;
      fields[String(k).slice(0, 80)] = v.slice(0, 500);
      if (v.trim()) any = true;
    }
    const message = typeof b.message === 'string' ? b.message.slice(0, 5000) : '';
    if (!any && !message.trim()) return res.status(400).json({ error: 'Empty message' });

    const { error } = await supabase.from('messages').insert({ intent, fields, message });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid submission' });
  }
};
