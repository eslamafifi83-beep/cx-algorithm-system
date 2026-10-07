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
      fs.writeFileSync(file, JSON.stringify({
        source: 'https://www.linkedin.com/pulse/' + key + '/',
        title: art.title,
        published: art.published,
        imported: new Date().toISOString().slice(0, 10),
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
