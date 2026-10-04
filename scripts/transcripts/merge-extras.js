// extras/NN.json -> the site's transcripts/<sid>.json (adds takeaways, quote, resources), after checks:
//   the quote must be the guest's exact words; 5-7 takeaways; no "weekly"; every URL must load (else dropped).
const fs = require('fs');
const path = require('path');
const REPO = 'C:/Users/eslam/MOCKUPS/cx-algorithm-system';
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function urlOk(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheCXAlgorithm link check)' } });
      clearTimeout(timer);
      if (r.ok) return true;
      if (method === 'GET') return false;
    } catch (e) { if (method === 'GET') return false; }
  }
  return false;
}

(async () => {
  for (const f of fs.readdirSync(path.join(__dirname, 'extras')).filter(f => f.endsWith('.json')).sort()) {
    const n = f.slice(0, 2);
    const x = JSON.parse(fs.readFileSync(path.join(__dirname, 'extras', f), 'utf8'));
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'drafts', f), 'utf8'));
    const txFile = path.join(REPO, 'transcripts', d.sid + '.json');
    const tx = JSON.parse(fs.readFileSync(txFile, 'utf8'));
    const problems = [];

    // takeaways
    let takeaways = (x.takeaways || []).map(s => String(s).trim().replace(/\.$/, '')).filter(Boolean);
    if (takeaways.some(t => /weekly/i.test(t))) { problems.push('takeaway mentions weekly, removed'); takeaways = takeaways.filter(t => !/weekly/i.test(t)); }
    if (takeaways.length < 5 || takeaways.length > 7) problems.push('takeaways count ' + takeaways.length);

    // quote: exact words of the guest
    let quote = null;
    if (x.quote && x.quote.text) {
      const q = norm(x.quote.text);
      const p = d.paragraphs.find(p => p.speaker !== 'Eslam' && norm(p.text).includes(q));
      if (p && q.split(' ').length >= 8) quote = { text: x.quote.text.trim(), t: p.t };
      else problems.push('quote not found verbatim in a guest paragraph: dropped');
    }

    // resources: keep labels; keep a URL only if it loads
    const resources = [];
    for (const r of (x.resources || []).filter(r => r && r.label)) {
      const item = { label: String(r.label).trim(), note: String(r.note || '').trim() };
      if (r.url) { if (await urlOk(r.url)) item.url = r.url; else problems.push('link dropped (does not load): ' + r.url); }
      resources.push(item);
    }

    tx.takeaways = takeaways;
    if (quote) tx.quote = quote;
    tx.resources = resources;
    fs.writeFileSync(txFile, JSON.stringify(tx, null, 1) + '\n');
    console.log(`EP${n}: ${takeaways.length} takeaways, quote ${quote ? 'ok' : 'NONE'}, ${resources.length} resources (${resources.filter(r => r.url).length} links)` + (problems.length ? '\n   ! ' + problems.join('\n   ! ') : ''));
  }
})();
