// Connect the booking page to Google Calendar.
// POST /api/booking-google {action:"status"|"start"|"disconnect"}  (admin only)
// GET  /api/booking-google?code=…&state=…  -> Google sends you back here after you sign in
const { isAdmin } = require('../lib/auth');
const { google } = require('../lib/booking');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const q = req.query || {};
    const back = msg => { res.writeHead(302, { Location: '/admin#bookings?google=' + msg }); res.end(); };
    if (q.error) return back('cancelled');
    if (!q.code || !google.validState(q.state)) return back('failed');
    try { await google.exchange(String(q.code)); return back('connected'); }
    catch (e) { console.warn('[booking-google]', e.message); return back('failed'); }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const action = (req.body || {}).action;
  try {
    if (action === 'start') {
      if (!google.configured()) return res.status(400).json({ error: 'Google keys are not set up in Vercel yet.' });
      return res.status(200).json({ ok: true, url: google.authUrl() });
    }
    if (action === 'disconnect') {
      await google.forget();
      return res.status(200).json({ ok: true, connected: false });
    }
    let connected = false, working = false;
    if (google.configured()) {
      connected = await google.connected();
      if (connected) { try { await google.accessToken(); working = true; } catch (e) { working = false; } }
    }
    return res.status(200).json({ ok: true, configured: google.configured(), connected, working });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
