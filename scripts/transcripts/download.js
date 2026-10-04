// Download each episode's audio (the public MP3 enclosures in the podcast RSS feed) + a manifest.
const fs = require('fs');
const path = require('path');
const { parseFeed } = require('C:/Users/eslam/MOCKUPS/cx-algorithm-system/lib/podcast-feed.js');
const DIR = __dirname;
(async () => {
  const xml = await (await fetch('https://anchor.fm/s/10dcc5b9c/podcast/rss')).text();
  const items = parseFeed(xml);
  const enclosures = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => (/<enclosure[^>]*url="([^"]+)"/.exec(m[1]) || [])[1]);
  fs.mkdirSync(path.join(DIR, 'audio'), { recursive: true });
  const manifest = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i], url = enclosures[i];
    const file = path.join(DIR, 'audio', it.key.slice(0, 60) + '.mp3');
    if (!fs.existsSync(file) || fs.statSync(file).size < 1e6) {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) { console.log('FAILED', r.status, it.title); continue; }
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    }
    manifest.push({ title: it.title, key: it.key, number: it.number, releaseDate: it.releaseDate, durationMs: it.durationMs, file });
    console.log('ok', Math.round(fs.statSync(file).size / 1048576) + 'MB', it.title.slice(0, 60));
  }
  fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 1));
})();
