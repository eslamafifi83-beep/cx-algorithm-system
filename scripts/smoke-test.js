/* End-to-end smoke test: runs every API function against the LIVE Supabase project.
 * Usage: node scripts/smoke-test.js   (reads ../.env)
 * Leaves the database exactly as it found it (except seeding site_content, which is desired).
 */
const fs = require('fs');
const path = require('path');

// --- load .env manually (no dependency needed) ---
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = /^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/.exec(line);
  if (m && !line.trim().startsWith('#')) process.env[m[1]] = m[2];
}

const URL = process.env.SUPABASE_URL;
const ADMIN_KEY = `${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`;

// --- tiny mock of Vercel's (req, res) ---
function mockRes() {
  const r = { statusCode: 200, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (o) => { r.body = o; return r; };
  r.send = (s) => { r.body = typeof s === 'string' ? JSON.parse(s) : s; return r; };
  return r;
}
async function call(handler, { method = 'GET', headers = {}, body = null } = {}) {
  const res = mockRes();
  await handler({ method, headers, body }, res);
  return res;
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const content = require('../api/content.js');
  const contact = require('../api/contact.js');
  const messages = require('../api/messages/index.js');
  const msgDelete = require('../api/messages/delete.js');
  const upload = require('../api/upload.js');
  const uploadUrl = require('../api/upload-url.js');
  const { supabase } = require('../lib/supabase.js');
  const { createClient } = require('@supabase/supabase-js');

  // 1. GET /api/content — first run should SEED the database from content.json
  let r = await call(content, { method: 'GET' });
  check('GET /api/content returns 200', r.statusCode === 200);
  check('content has hero headline', !!(r.body && r.body.hero && r.body.hero.headlineLine1),
    r.body && r.body.hero ? `"${r.body.hero.headlineLine1}"` : JSON.stringify(r.body).slice(0, 120));
  check('content has episodes[]', Array.isArray(r.body && r.body.episodes) && r.body.episodes.length >= 3,
    `episodes: ${(r.body.episodes || []).length}`);
  const liveContent = r.body;

  // 2. Confirm the seed actually landed in the database table
  const row = await supabase.from('site_content').select('data, updated_at').eq('id', 1).single();
  check('site_content row exists in DB', !row.error && !!row.data,
    row.data ? `updated_at ${row.data.updated_at}` : row.error && row.error.message);

  // 3. POST /api/content without auth → must be rejected
  r = await call(content, { method: 'POST', body: { hacked: true } });
  check('POST /api/content unauthenticated → 401', r.statusCode === 401);

  // 4. POST /api/content with admin key → saves
  r = await call(content, { method: 'POST', headers: { 'x-admin-key': ADMIN_KEY }, body: liveContent });
  check('POST /api/content with admin key → ok', r.statusCode === 200 && r.body.ok === true);

  // 5. Contact form: valid submission
  r = await call(contact, { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.7' },
    body: { intent: 'speak', fields: { 'Your name': 'Smoke Test' }, message: 'live smoke test' } });
  check('POST /api/contact valid → ok', r.statusCode === 200 && r.body.ok === true, JSON.stringify(r.body));

  // 6. Contact form: garbage rejected
  r = await call(contact, { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.7' },
    body: { intent: 'speak', fields: {}, message: '' } });
  check('POST /api/contact empty → 400', r.statusCode === 400);

  // 7. Messages: unauthenticated blocked; admin sees the test message
  r = await call(messages, { method: 'GET' });
  check('GET /api/messages unauthenticated → 401', r.statusCode === 401);
  r = await call(messages, { method: 'GET', headers: { 'x-admin-key': ADMIN_KEY } });
  const found = (r.body.messages || []).find(m => m.fields && m.fields['Your name'] === 'Smoke Test');
  check('GET /api/messages with admin key finds test msg', !!found, found && found.id);

  // 8. RLS proof: the PUBLIC key must NOT be able to read messages
  const anon = createClient(URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const anonRead = await anon.from('messages').select('*');
  check('Row Level Security: public key sees ZERO messages',
    (anonRead.data || []).length === 0, `public key got ${(anonRead.data || []).length} rows`);

  // 9. Delete the test message
  r = await call(msgDelete, { method: 'POST', headers: { 'x-admin-key': ADMIN_KEY }, body: { id: found && found.id } });
  check('POST /api/messages/delete removes it', r.statusCode === 200 && r.body.removed === 1, JSON.stringify(r.body));

  // 10. Image upload → public URL must actually serve the image
  const png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  r = await call(upload, { method: 'POST', headers: { 'x-admin-key': ADMIN_KEY },
    body: { name: 'smoke.png', data: 'data:image/png;base64,' + png1x1 } });
  check('POST /api/upload → public URL', r.statusCode === 200 && /^https:\/\//.test(r.body.path || ''), r.body.path);
  const imgUrl = r.body.path;
  let fr = await fetch(imgUrl);
  check('uploaded image is publicly reachable', fr.status === 200 && (fr.headers.get('content-type') || '').includes('image'),
    `HTTP ${fr.status} ${fr.headers.get('content-type')}`);

  // 11. Large-media flow: mint signed URL, upload with a RAW browser-style PUT, verify public
  r = await call(uploadUrl, { method: 'POST', headers: { 'x-admin-key': ADMIN_KEY }, body: { name: 'smoke.mp3' } });
  check('POST /api/upload-url mints token', r.statusCode === 200 && !!r.body.token, r.body.path);
  const { path: mediaPath, token, publicUrl } = r.body;
  const fakeMp3 = Buffer.alloc(4096, 7);
  const putRes = await fetch(`${URL}/storage/v1/object/upload/sign/media/${mediaPath}?token=${encodeURIComponent(token)}`,
    { method: 'PUT', headers: { 'Content-Type': 'audio/mpeg' }, body: fakeMp3 });
  check('browser-style PUT to signed URL succeeds', putRes.status === 200, `HTTP ${putRes.status} ${await putRes.text().then(t => t.slice(0, 80))}`);
  fr = await fetch(publicUrl);
  check('uploaded media is publicly reachable', fr.status === 200, `HTTP ${fr.status}, ${fr.headers.get('content-length')} bytes`);

  // 12. Cleanup the test files
  const imgName = imgUrl.split('/').pop();
  const del1 = await supabase.storage.from('uploads').remove([imgName]);
  const del2 = await supabase.storage.from('media').remove([mediaPath]);
  check('cleanup: test files removed', !del1.error && !del2.error);

  const fails = results.filter(x => !x.ok).length;
  console.log(`\n==== ${results.length - fails}/${results.length} PASSED ====`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
