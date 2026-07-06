// GET /api/messages  -> list contact submissions, newest first (admin only)
const { supabase } = require('../../lib/supabase');
const { isAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { data, error } = await supabase
      .from('messages').select('*').order('received_at', { ascending: false }).limit(500);
    if (error) throw error;
    const messages = (data || []).map(m => ({
      id: m.id, receivedAt: m.received_at, intent: m.intent, fields: m.fields, message: m.message
    }));
    return res.status(200).json({ ok: true, messages });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
