#!/usr/bin/env node
// Saves a copy of every article listed in admin → Blog from LinkedIn into articles/<key>.json,
// which the site's article pages (/blog/<address>) are built from. Run it after adding or editing an
// article on LinkedIn, then commit articles/ and push:
//
//   node scripts/articles/import.js            every article (overwrites the saved copies)
//   node scripts/articles/import.js --new      only articles with no saved copy yet
//
// An article with no saved copy still gets a page: it is read from LinkedIn when someone opens it
// (and if LinkedIn doesn't answer, the visitor is sent to the article on LinkedIn instead).
const fs = require('fs');
const path = require('path');
const { pulseKey, fetchArticle } = require('../../lib/linkedin-article');

const SITE = 'https://www.thecxalgorithm.com';

// Width and height of a PNG or JPEG cover (so the page can keep its space while it loads)
async function imageSize(url) {
  try {
    if (!/^https?:/.test(url) || /\.(mp4|webm|mov)(\?|$)/i.test(url)) return null;
    const b = Buffer.from(await (await fetch(url)).arrayBuffer());
    if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  } catch (e) { /* no size */ }
  return null;
}
const OUT = path.join(__dirname, '..', '..', 'articles');

// Corrections applied to the site's copy (fix them on LinkedIn too when you can)
const FIXES = [
  [/Kate Calling/g, 'Kate Couling']
];

(async () => {
  const onlyNew = process.argv.includes('--new');
  const content = await (await fetch(SITE + '/api/content', { cache: 'no-store' })).json();
  const articles = ((content.blog && content.blog.articles) || []).filter(a => a && a.title && a.linkedInUrl);
  fs.mkdirSync(OUT, { recursive: true });
  let saved = 0, failed = 0;
  for (const a of articles) {
    const key = pulseKey(a.linkedInUrl);
    if (!key) { console.log('skip (not a LinkedIn article address):', a.title); continue; }
    const file = path.join(OUT, key + '.json');
    if (onlyNew && fs.existsSync(file)) { console.log('have  ', a.title); continue; }
    try {
      const art = await fetchArticle(a.linkedInUrl, 20000);
      let html = art.html;
      FIXES.forEach(([re, to]) => { html = html.replace(re, to); });
      if (html.length < 500) throw new Error('article text looks empty');
      const size = await imageSize(a.thumbnail);
      fs.writeFileSync(file, JSON.stringify({
        source: 'https://www.linkedin.com/pulse/' + key + '/',
        title: art.title,
        published: art.published,
        imported: new Date().toISOString().slice(0, 10),
        hero: size ? { src: a.thumbnail, w: size.w, h: size.h } : undefined,
        html
      }, null, 1) + '\n');
      saved++;
      console.log('saved ', a.title, '(' + html.length + ' chars)');
    } catch (e) {
      failed++;
      console.log('FAILED', a.title, '-', e.message);
    }
  }
  console.log(`\n${saved} saved, ${failed} failed. Commit the articles/ folder and push to publish.`);
})();
