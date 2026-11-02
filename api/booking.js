// GET  /api/booking  -> open 30-minute times (UTC ms) for the /book page (public)
// POST /api/booking  -> book a time, or ask for another time (public, rate-limited)
// Google Calendar connection (kept in this one function: the Hobby plan allows 12 functions):
// POST /api/booking {action:"status"|"start"|"disconnect"}  (admin only)
// GET  /api/booking?code=…&state=…  -> Google sends you back here after you sign in
const { supabase } = require('../lib/supabase');
const { isAdmin } = require('../lib/auth');
const { TZ, LENGTH, loadSettings, openSlots, slotView, fmt, google } = require('../lib/booking');

const hits = new Map();
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const validTz = tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch (e) { return false; } };

async function googleCallback(req, res) {
  const q = req.query || {};
  const back = msg => { res.writeHead(302, { Location: '/admin#bookings?google=' + msg }); res.end(); };
  if (q.error) return back('cancelled');
  if (!google.validState(q.state)) return back('failed');
  try { await google.exchange(String(q.code)); return back('connected'); }
  catch (e) { console.warn('[booking] Google connect failed:', e.message); return back('failed'); }
}

async function googleAdmin(req, res, action) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
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
}

module.exports = async (req, res) => {
  if (req.method === 'GET' && req.query && (req.query.code || req.query.error)) return googleCallback(req, res);
  if (req.method === 'POST' && req.body && typeof req.body.action === 'string') return googleAdmin(req, res, req.body.action);

  if (req.method === 'GET') {
    try {
      const settings = await loadSettings();
      const { slots, taken } = await slotView(settings);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, tz: TZ, length: LENGTH, paused: !!settings.paused, slots, taken });
    } catch (e) {
      return res.status(500).json({ error: 'Could not load times' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (recent.length >= 5) return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
  recent.push(now);
  hits.set(ip, recent);

  try {
    const b = req.body || {};
    const name = str(b.name, 120), email = str(b.email, 200), message = str(b.message, 3000);
    const guestTz = validTz(b.tz) ? String(b.tz) : 'UTC';
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please add your name and a valid email.' });
    if (!message) return res.status(400).json({ error: 'Please add a short message.' });

    // "Ask for another time": no calendar entry, just a message for Eslam.
    if (b.ask) {
      const when = str(b.when, 300);
      if (!when) return res.status(400).json({ error: 'Please say when suits you.' });
      const { error } = await supabase.from('messages').insert({
        intent: 'booking-request',
        fields: { Name: name, Email: email, 'When suits them': when, 'Their time zone': guestTz },
        message
      });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    const start = Number(b.start);
    const settings = await loadSettings();
    const open = await openSlots(settings);
    if (!open.includes(start)) return res.status(409).json({ error: 'Sorry, that time was just taken. Please pick another.' });

    let event = null, googleError = '';
    try { event = await google.createEvent({ start, name, email, message, guestTz }); }
    catch (e) { googleError = e.message; console.warn('[booking] Google event failed:', e.message); }

    const { error } = await supabase.from('messages').insert({
      intent: 'booking',
      fields: {
        Name: name, Email: email,
        'When (Melbourne)': fmt(start, TZ),
        'When (their time)': fmt(start, guestTz) + ' · ' + guestTz,
        'Calendar invite': event ? 'Sent by Google Calendar' + (event.meet ? ' · ' + event.meet : '') : 'Not sent: add it yourself',
        startUtc: new Date(start).toISOString()
      },
      message
    });
    if (error) throw error;
    return res.status(200).json({ ok: true, invite: !!event, meet: event ? event.meet : '', googleError: googleError ? 'calendar' : '' });
  } catch (e) {
    return res.status(400).json({ error: 'Could not book that time. Please try again.' });
  }
};
