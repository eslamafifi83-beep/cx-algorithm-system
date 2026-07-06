// POST /api/messages/delete  -> delete one contact submission by id (admin only)
const { supabase } = require('../../lib/supabase');
const { isAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const id = req.body && req.body.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const before = await supabase.from('messages').select('id').eq('id', id);
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ ok: true, removed: (before.data || []).length });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
