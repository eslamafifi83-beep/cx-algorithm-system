// drafts/*.json + live content -> review/transcript-review.html (the private review page).
// Decisions are saved by the page to its db collection "review" (docs ep01..ep08), read back by Claude.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const { episodeSlugs } = require('C:/Users/eslam/MOCKUPS/cx-algorithm-system/assets/links.js');
const content = require('../live-content.json');
const slugs = episodeSlugs(content.episodes);
const sidOf = ep => ((/episode[/:]([A-Za-z0-9]{22})/.exec(String(ep.audio || '') + ' ' + String(ep.video || '')) || [])[1]);
const raws = {};
const eps = fs.readdirSync(path.join(DIR, 'drafts')).filter(f => f.endsWith('.json')).sort().map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, 'drafts', f), 'utf8'));
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, 'raw', f), 'utf8'));
  const i = content.episodes.findIndex(ep => sidOf(ep) === d.sid);
  const words = d.paragraphs.reduce((n, p) => n + p.text.split(/\s+/).length, 0);
  // Flags about a word doubled across a segment join are moot: build.js already removed those doubles
  const nw = s => String(s || '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim().split(' ');
  const joinDoubled = i => {
    const a = raw.segments[i - 1], b = raw.segments[i];
    return a && b && nw(a.text).pop() === nw(b.text)[0];
  };
  d.unsure = d.unsure.filter(u => !(u.i > 0 && /doubled|repeat/i.test(u.why || '') && joinDoubled(u.i)));
  // Word check: casual or sensitive words get flagged for a keep-or-cut decision
  const WORDS = /\b(dick|dicks|fuck\w*|shit\w*|bitch\w*|cunt|asshole|bastard|damn|crap|piss\w*|whore|slut|retard\w*|sexy|sex|porn\w*|penis|vagina|boobs?|tits?)\b/i;
  d.paragraphs.forEach(p => {
    const m = WORDS.exec(p.text);
    if (!m) return;
    const i = m.index;
    d.unsure.push({ t: p.t, text: '…' + p.text.slice(Math.max(0, i - 70), i + 50).trim() + '…', why: `Word check: "${m[0]}" (${p.speaker}). Keep or cut?`, auto: true });
  });
  return {
    key: 'ep' + String(d.n).padStart(2, '0'), n: d.n, title: d.title, guest: d.guest,
    url: i >= 0 ? 'https://www.thecxalgorithm.com/episodes/' + slugs[i] : '',
    minutes: Math.round(raw.duration / 60), words,
    paragraphs: d.paragraphs, chapters: d.chapters,
    fixes: d.fixes.map(x => ({ from: x.from, to: x.to })),
    unsure: d.unsure.map(u => ({ t: u.auto ? u.t : Math.floor((raw.segments[u.i] || {}).start || 0), text: u.text, why: u.why }))
      .sort((a, b) => a.t - b.t),
    notes: d.notes
  };
});
const data = JSON.stringify(eps).replace(/</g, '\\u003c');
const tpl = fs.readFileSync(path.join(DIR, 'review-template.html'), 'utf8');
fs.writeFileSync(path.join(DIR, 'transcript-review.html'), tpl.replace('/*__DATA__*/[]', () => data));
console.log('episodes', eps.length, 'size', Math.round(fs.statSync(path.join(DIR, 'transcript-review.html')).size / 1024) + 'KB');
