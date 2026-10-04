// Copy APPROVED drafts into the website repo as transcripts/<spotify id>.json ({ paragraphs, chapters }).
// Usage: node publish.js 01 04 07   (episode numbers the host approved; corrections applied to drafts first)
// Only the transcript and chapters are published; review notes, flags and fix lists stay here.
const fs = require('fs');
const path = require('path');
const REPO = 'C:/Users/eslam/MOCKUPS/cx-algorithm-system';
const nums = process.argv.slice(2).map(n => n.padStart(2, '0'));
if (!nums.length) { console.log('Pass the approved episode numbers, e.g. node publish.js 01 04'); process.exit(1); }
fs.mkdirSync(path.join(REPO, 'transcripts'), { recursive: true });
for (const n of nums) {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'drafts', n + '.json'), 'utf8'));
  if (!/^[A-Za-z0-9]{22}$/.test(d.sid || '')) { console.log(n, 'has no Spotify id, skipped'); continue; }
  const out = {
    episode: d.n, title: d.title,
    paragraphs: d.paragraphs.map(p => ({ t: p.t, speaker: p.speaker, text: p.text })),
    chapters: d.chapters.map(c => ({ t: c.t, title: c.title }))
  };
  fs.writeFileSync(path.join(REPO, 'transcripts', d.sid + '.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(n, '->', 'transcripts/' + d.sid + '.json', out.paragraphs.length, 'paragraphs', out.chapters.length, 'chapters');
}
