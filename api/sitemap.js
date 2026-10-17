// GET /sitemap.xml   (vercel.json rewrites it here)
// Lists every page, including one address per episode, straight from the saved content,
// so new episodes reach search engines without editing a file.
// GET /llms.txt      (rewritten here with ?format=llms): the same site map as plain text for AI assistants.
const { supabase } = require('../lib/supabase');
const { sitePaths, absolute } = require('../lib/site-urls');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// "2026-02-08T11:44:21Z", "8 Feb 2026" -> "2026-02-08"; month-only dates ("Oct, 2026") are too vague -> ''
function day(v) {
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (!/\b\d{1,2}\b/.test(s.replace(/\b\d{4}\b/, ''))) return '';
  const d = new Date(s.replace(/,/g, ' ') + ' 12:00 UTC');
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}
const newest = list => list.filter(Boolean).sort().pop() || '';

// Last-modified day per address: each episode's release date (podcast feed), each article's
// published date (saved copy), the newest of those for the hub pages; the content save date otherwise
async function lastModified(content, updated) {
  const { episodeSlugs, articleSlugs } = require('../assets/links.js');
  const { feedItems, matchItem } = require('../lib/podcast-feed');
  const { savedCopy, listOf } = require('../lib/article-page');
  const out = {};
  const feed = await feedItems(2000).catch(() => []);
  const eps = Array.isArray(content.episodes) ? content.episodes : [];
  const epSlugs = episodeSlugs(eps);
  const epDays = eps.map((ep, i) => {
    const number = parseInt((/\d+/.exec((ep && ep.eyebrow) || '') || [i + 1])[0], 10);
    const item = matchItem(feed, ep && ep.title, number);
    const d = (item && item.releaseDate) || day(ep && ep.date);
    out['/episodes/' + epSlugs[i]] = d;
    return d;
  });
  const arts = listOf(content);
  const artSlugs = articleSlugs(arts);
  const artDays = arts.map((a, i) => {
    let d = '';
    try { const copy = savedCopy(a); d = day(copy && copy.published); } catch (e) { /* no saved copy */ }
    d = d || day(a.date);
    out['/blog/' + artSlugs[i]] = d;
    return d;
  });
  const latestEp = newest(epDays), latestArt = newest(artDays);
  out['/'] = newest([latestEp, latestArt]);
  out['/episodes'] = latestEp;
  out['/guests'] = latestEp;
  out['/blog'] = latestArt;
  Object.keys(out).forEach(p => { out[p] = out[p] || updated; });
  return out;
}

module.exports = async (req, res) => {
  let content = {}, updated = '';
  try {
    const { data, error } = await supabase.from('site_content').select('data, updated_at').eq('id', 1).maybeSingle();
    if (error) throw error;
    content = (data && data.data) || {};
    updated = data && data.updated_at ? String(data.updated_at).slice(0, 10) : '';
  } catch (e) {
    // Still list the fixed pages
  }

  if (req.query && req.query.format === 'llms') {
    const { feedItems } = require('../lib/podcast-feed');
    const { llmsText } = require('../lib/llms');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(llmsText(content, await feedItems(2000)));
  }

  let dates = {};
  try { dates = await lastModified(content, updated); } catch (e) { /* every page gets the save date */ }
  const urls = sitePaths(content).map(p => {
    const mod = dates[p] || updated;
    return `  <url><loc>${esc(absolute(p))}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`;
  });
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
};
