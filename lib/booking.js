// Booking calendar: open times from the admin settings (content.booking), minus calls
// already booked (the `messages` table, intent "booking") and, once Google Calendar is
// connected, minus anything busy in that calendar. Server-side only.
const crypto = require('crypto');
const { supabase } = require('./supabase');

const TZ = 'Australia/Melbourne';
const LENGTH = 30; // minutes

const DEFAULTS = {
  days: {
    0: { on: true, s: '16:00', e: '22:00' },
    1: { on: true, s: '19:30', e: '22:30' },
    2: { on: true, s: '19:30', e: '22:30' },
    3: { on: true, s: '19:30', e: '22:30' },
    4: { on: true, s: '19:30', e: '22:30' },
    5: { on: true, s: '19:30', e: '22:30' },
    6: { on: true, s: '16:00', e: '22:00' }
  },
  maxWeekday: 2,
  maxWeekend: 3,
  bufferMins: 15,
  noticeHours: 12,
  weeksAhead: 3,
  paused: false
};

function settingsFrom(content) {
  const b = (content && content.booking) || {};
  const out = { ...DEFAULTS, ...b, days: { ...DEFAULTS.days } };
  for (let d = 0; d < 7; d++) if (b.days && b.days[d]) out.days[d] = { ...DEFAULTS.days[d], ...b.days[d] };
  return out;
}

async function loadSettings() {
  const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).maybeSingle();
  if (error) throw error;
  return settingsFrom(data && data.data);
}

/* ---- Time zones: wall-clock time in a zone <-> UTC milliseconds ---- */
function parts(ms, tz) {
  const o = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(ms)).forEach(p => { o[p.type] = p.value; });
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute };
}
function offset(ms, tz) {
  const p = parts(ms, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(ms / 60000) * 60000;
}
function wall(y, m, d, h, mi, tz) {
  const g = Date.UTC(y, m - 1, d, h, mi);
  let t = g - offset(g, tz);
  const o2 = offset(t, tz);
  if (g - o2 !== t) t = g - o2;
  return t;
}
const mins = s => { const [a, b] = String(s).split(':'); return (+a) * 60 + (+b || 0); };
const dayKey = ms => { const p = parts(ms, TZ); return `${p.y}-${p.m}-${p.d}`; };

function fmt(ms, tz) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(ms)).replace(/\s/g, ' ');
}

/* ---- Booked calls (kept in the messages table so they also show in admin → Messages) ---- */
async function bookedStarts(fromMs) {
  const since = new Date(fromMs - 7 * 864e5).toISOString();
  const { data, error } = await supabase.from('messages')
    .select('id, fields').eq('intent', 'booking').gte('received_at', new Date(Date.now() - 120 * 864e5).toISOString());
  if (error) throw error;
  return (data || []).map(r => Date.parse(r.fields && r.fields.startUtc)).filter(ms => ms && ms >= Date.parse(since));
}

/* ---- Open times ---- */
async function openSlots(settings, now = Date.now()) {
  if (settings.paused) return [];
  const soonest = now + settings.noticeHours * 3600e3;
  const until = now + settings.weeksAhead * 7 * 864e5;
  const booked = await bookedStarts(now);
  const busy = booked.map(s => [s, s + LENGTH * 60e3]);
  try { busy.push(...await google.busy(now, until + 864e5)); } catch (e) { console.warn('[booking] free/busy failed:', e.message); }
  const pad = settings.bufferMins * 60e3;

  const perDay = {};
  booked.forEach(s => { const k = dayKey(s); perDay[k] = (perDay[k] || 0) + 1; });

  const p = parts(now, TZ), out = [];
  for (let i = 0; i <= settings.weeksAhead * 7; i++) {
    const base = new Date(Date.UTC(p.y, p.m - 1, p.d + i));
    const wd = base.getUTCDay(), c = settings.days[wd];
    if (!c || !c.on) continue;
    const y = base.getUTCFullYear(), m = base.getUTCMonth() + 1, d = base.getUTCDate();
    const cap = (wd === 0 || wd === 6) ? settings.maxWeekend : settings.maxWeekday;
    if ((perDay[`${y}-${m}-${d}`] || 0) >= cap) continue;
    const end = c.e === '24:00' ? 1440 : mins(c.e);
    for (let t = mins(c.s); t + LENGTH <= end; t += 30) {
      const s = wall(y, m, d, Math.floor(t / 60), t % 60, TZ), e = s + LENGTH * 60e3;
      if (s < soonest || s > until) continue;
      if (busy.some(([bs, be]) => s < be + pad && e > bs - pad)) continue;
      out.push(s);
    }
  }
  return out;
}

/* ---- Google Calendar (optional). The refresh token lives in a private storage bucket that
 * only this server can read; it is never sent to the browser. ---- */
const BUCKET = 'private', FILE = 'google-calendar.json';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy';
const REDIRECT = (process.env.SITE_URL || 'https://www.thecxalgorithm.com') + '/api/booking-google';

const google = {
  configured: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),

  async readToken() {
    const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
    if (error || !data) return null;
    try { return JSON.parse(await data.text()); } catch (e) { return null; }
  },
  async saveToken(obj) {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!(buckets || []).some(b => b.name === BUCKET)) await supabase.storage.createBucket(BUCKET, { public: false });
    const { error } = await supabase.storage.from(BUCKET)
      .upload(FILE, Buffer.from(JSON.stringify(obj)), { upsert: true, contentType: 'application/json' });
    if (error) throw error;
  },
  async forget() { await supabase.storage.from(BUCKET).remove([FILE]); },

  async connected() {
    if (!this.configured()) return false;
    const t = await this.readToken();
    return !!(t && t.refresh_token);
  },

  async accessToken() {
    if (!this.configured()) return null;
    const t = await this.readToken();
    if (!t || !t.refresh_token) return null;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: t.refresh_token, grant_type: 'refresh_token'
      })
    });
    const out = await res.json();
    if (!res.ok) throw new Error('Google sign-in expired: ' + (out.error || res.status));
    return out.access_token;
  },

  async busy(fromMs, toMs) {
    const token = await this.accessToken();
    if (!token) return [];
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: new Date(fromMs).toISOString(), timeMax: new Date(toMs).toISOString(), items: [{ id: 'primary' }] })
    });
    const out = await res.json();
    if (!res.ok) throw new Error((out.error && out.error.message) || 'free/busy ' + res.status);
    return ((out.calendars && out.calendars.primary && out.calendars.primary.busy) || [])
      .map(b => [Date.parse(b.start), Date.parse(b.end)]);
  },

  // Creates the event with a Google Meet link; Google emails the invite to the guest.
  async createEvent({ start, name, email, message, guestTz }) {
    const token = await this.accessToken();
    if (!token) return null;
    const body = {
      summary: `The CX Algorithm · call with ${name}`,
      description: `Booked on thecxalgorithm.com/book\n\n${name} <${email}>\nTheir time zone: ${guestTz}\n\n${message}`,
      start: { dateTime: new Date(start).toISOString(), timeZone: TZ },
      end: { dateTime: new Date(start + LENGTH * 60e3).toISOString(), timeZone: TZ },
      attendees: [{ email, displayName: name }],
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      extendedProperties: { private: { cxbooking: '1' } }
    };
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const out = await res.json();
    if (!res.ok) throw new Error((out.error && out.error.message) || 'event ' + res.status);
    return { id: out.id, meet: out.hangoutLink || '', link: out.htmlLink || '' };
  },

  // Signed "state" so only a sign-in started from the admin panel can connect a calendar.
  sign(ts) { return crypto.createHmac('sha256', String(process.env.ADMIN_PASSWORD || '')).update('gcal:' + ts).digest('hex').slice(0, 32); },
  authUrl() {
    const ts = Date.now();
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code',
      scope: SCOPES, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true',
      state: ts + '.' + this.sign(ts)
    });
  },
  validState(state) {
    const [ts, sig] = String(state || '').split('.');
    if (!ts || !sig || Date.now() - +ts > 15 * 60e3) return false;
    const a = Buffer.from(sig), b = Buffer.from(this.sign(ts));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },
  async exchange(code) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT, grant_type: 'authorization_code'
      })
    });
    const out = await res.json();
    if (!res.ok || !out.refresh_token) throw new Error(out.error_description || out.error || 'No refresh token returned');
    await this.saveToken({ refresh_token: out.refresh_token, connectedAt: new Date().toISOString() });
  }
};

module.exports = { TZ, LENGTH, DEFAULTS, settingsFrom, loadSettings, openSlots, fmt, google };
