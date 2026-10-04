// raw/<n>.json + punct/<n>.json + review/<n>.json -> drafts/<n>.json in the site's transcript format:
//   { sid, n, title, guest, paragraphs: [{ t, speaker, text }], chapters: [{ t, title }], fixes, unsure, notes, stats }
// Wording is always Whisper's. Punctuation/capitals from punct/ are accepted per segment only if the
// words are identical; doubled words at segment joins are removed; name fixes from review/ are applied.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
fs.mkdirSync(path.join(DIR, 'drafts'), { recursive: true });
const MAX_WORDS = 140;
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const only = process.argv.slice(2);

for (const f of fs.readdirSync(path.join(DIR, 'raw')).filter(f => f.endsWith('.json')).sort()) {
  if (only.length && !only.includes(f.slice(0, 2))) continue;
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, 'raw', f), 'utf8'));
  const revFile = path.join(DIR, 'review', f), punFile = path.join(DIR, 'punct', f);
  if (!fs.existsSync(revFile) || !fs.existsSync(punFile)) { console.log(f, 'waiting for', !fs.existsSync(revFile) ? 'review' : 'punctuation'); continue; }
  const rev = JSON.parse(fs.readFileSync(revFile, 'utf8'));
  const pun = JSON.parse(fs.readFileSync(punFile, 'utf8'));
  const byIdx = new Map((Array.isArray(pun) ? pun : []).map(p => [p.i, p.text]));

  // 1) punctuation and capitals, only where the words are unchanged
  let accepted = 0, rejected = 0;
  const texts = raw.segments.map((s, i) => {
    const p = byIdx.get(i);
    if (typeof p === 'string' && norm(p) === norm(s.text)) { if (p.trim() !== s.text.trim()) accepted++; return p.trim(); }
    if (typeof p === 'string') rejected++;
    return s.text.trim();
  });

  // 2) a word doubled across a segment join ("... the" + "the market ...")
  let deduped = 0;
  for (let i = 1; i < texts.length; i++) {
    const prev = texts[i - 1].split(/\s+/), cur = texts[i].split(/\s+/);
    if (cur.length > 1 && norm(prev[prev.length - 1]) && norm(prev[prev.length - 1]) === norm(cur[0])) {
      cur.shift();
      if (/[.!?]["')]?$/.test(texts[i - 1])) cur[0] = cur[0].charAt(0).toUpperCase() + cur[0].slice(1);
      texts[i] = cur.join(' ');
      deduped++;
    }
  }

  // 3) misheard names and terms (case-insensitive, since capitals may have been restored)
  const fixes = (rev.fixes || []).filter(x => x && x.from && x.to && x.from !== x.to);
  let fixed = 0;
  // Whole words only ("Anna" -> "Ana" must not touch "Savannah")
  const pattern = from => (/^\w/.test(from) ? '\\b' : '') + escRe(from) + (/\w$/.test(from) ? '\\b' : '');
  const applyFixes = t => fixes.reduce((acc, x) => acc.replace(new RegExp(pattern(x.from), 'gi'), () => { fixed++; return x.to; }), t);
  const finalTexts = texts.map(applyFixes);

  // 4) speakers and paragraphs
  const guestName = rev.guestShortName || (raw.guest || 'Guest').replace(/\(.*?\)/g, '').replace(/^(Dr|Prof)\.?\s+/i, '').trim().split(/\s+/)[0];
  const turns = (rev.turns || []).slice().sort((a, b) => a.from - b.from);
  const who = i => { let s = 'host'; for (const t of turns) { if (t.from <= i) s = t.speaker; else break; } return s; };
  const paragraphs = [];
  let cur = null;
  raw.segments.forEach((s, i) => {
    const text = finalTexts[i];
    if (!text) return;
    const sp = who(i);
    const words = cur ? cur.text.split(/\s+/).length : 0;
    const sentenceEnd = cur && /[.!?]["')]?$/.test(cur.text);
    const pause = cur && s.start - cur.end > 2.5;
    if (!cur || cur.sp !== sp || (words > MAX_WORDS && sentenceEnd) || (pause && sentenceEnd && words > 40)) {
      cur = { t: Math.floor(s.start), sp, text, end: s.end };
      // A new speaker's paragraph starts with a capital
      cur.text = cur.text.charAt(0).toUpperCase() + cur.text.slice(1);
      paragraphs.push(cur);
    } else {
      cur.text += ' ' + text;
      cur.end = s.end;
    }
  });

  const out = {
    sid: raw.sid, n: raw.n, title: raw.title, guest: raw.guest,
    paragraphs: paragraphs.map(p => ({ t: p.t, speaker: p.sp === 'host' ? 'Eslam' : guestName, text: p.text })),
    chapters: (rev.chapters || []).map(c => ({ t: Math.round(c.t), title: c.title })),
    fixes, unsure: rev.unsure || [], notes: rev.notes || '',
    stats: { segments: raw.segments.length, punctuated: accepted, punctuationRejected: rejected, dedupedJoins: deduped, fixesApplied: fixed }
  };
  fs.writeFileSync(path.join(DIR, 'drafts', f), JSON.stringify(out, null, 1));
  const words = out.paragraphs.reduce((n, p) => n + p.text.split(/\s+/).length, 0);
  console.log(f, out.paragraphs.length, 'paragraphs,', words, 'words,', out.chapters.length, 'chapters |', JSON.stringify(out.stats), '| unsure', out.unsure.length);
}
