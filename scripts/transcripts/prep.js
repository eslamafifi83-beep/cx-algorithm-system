// raw/<n>.json (Whisper segments) -> seg/<n>.txt, one numbered line per segment for the review agents:
//   "<index> [m:ss] text"
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
fs.mkdirSync(path.join(DIR, 'seg'), { recursive: true });
const clock = s => { s = Math.round(s); const m = Math.floor(s / 60), x = String(s % 60).padStart(2, '0'); return `${m}:${x}`; };
for (const f of fs.readdirSync(path.join(DIR, 'raw')).filter(f => f.endsWith('.json'))) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, 'raw', f), 'utf8'));
  const lines = j.segments.map((s, i) => `${i} [${clock(s.start)}] ${s.text}`);
  const head = `# Episode ${j.n}: ${j.title}\n# Guest: ${j.guest}\n# Host: Dr Eslam Afifi\n# ${j.segments.length} segments\n`;
  fs.writeFileSync(path.join(DIR, 'seg', f.replace('.json', '.txt')), head + lines.join('\n') + '\n');
  console.log(f, j.segments.length, 'segments');
}
