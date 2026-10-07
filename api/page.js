// GET /, /guests, /episodes, /blog   (vercel.json rewrites them here as ?name=index|guests|episodes|blog)
// Also /blog/<address> (?name=article: an article as a page on the site, see lib/article-page.js)
// and /press-kit (?name=press-kit: sends the visitor to the current press kit PDF).
// Sends each page already filled in with the live guests, episodes and articles (lib/prerender runs
// the page's own scripts on the server), plus structured data, so search engines and AI assistants
// that don't run JavaScript see the full page. Visitors get the same page as before: their browser
// runs the same scripts. If ANYTHING fails (loading a module, the database, the prerender, or it takes
// too long), the untouched page is sent, exactly as the site worked before.
const fs = require('fs');
const path = require('path');

const PAGES = { index: '/', guests: '/guests', episodes: '/episodes', blog: '/blog' };
const SITE = 'https://www.thecxalgorithm.com';
const BUDGET_MS = 4000;

async function siteContent() {
  const { supabase } = require('../lib/supabase');
  const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data || !data.data) throw new Error('no content');
  return data.data;
}

// The press kit PDF uploaded in admin → Host; without one, the press-kit request form
async function pressKit(req, res) {
  let to = '/contact#press';
  try {
    const kit = String(((await siteContent()).host || {}).pressKit || '');
    if (/^https:\/\//.test(kit)) to = kit;
  } catch (e) { /* the request form */ }
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.setHeader('Location', to);
  return res.status(302).end();
}

// An article: the saved copy in articles/, else read from LinkedIn now, else off to LinkedIn
async function article(req, res) {
  const slug = String((req.query && req.query.slug) || '');
  const notFound = () => { res.setHeader('Cache-Control', 'public, s-maxage=60'); res.setHeader('Location', '/blog'); return res.status(302).end(); };
  let content;
  try { content = await siteContent(); } catch (e) { return notFound(); }
  const { route, render, savedCopy, listOf } = require('../lib/article-page');
  const to = route(content, slug);
  if (to.location) {
    res.setHeader('Cache-Control', 'public, s-maxage=600');
    res.setHeader('Location', to.location);
    return res.status(to.permanent ? 301 : 302).end();
  }
  if (!(to.idx >= 0)) return notFound();
  const a = listOf(content)[to.idx];
  let copy = savedCopy(a), fresh = !!copy;
  if (!copy && a.linkedInUrl) {
    try {
      const { fetchArticle } = require('../lib/linkedin-article');
      copy = await fetchArticle(a.linkedInUrl, 3500);
      if (!copy.html || copy.html.length < 300) copy = null;
    } catch (e) {
      console.error('article: LinkedIn read failed', slug, e && e.message);
      copy = null;
    }
  }
  if (!copy) {
    // No text to show: the article on LinkedIn (or the articles page)
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.setHeader('Location', String(a.linkedInUrl || '/blog').split('?')[0]);
    return res.status(302).end();
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', fresh ? 'public, s-maxage=300, stale-while-revalidate=86400' : 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(render(content, to.idx, copy));
}

module.exports = async (req, res) => {
  const name = String((req.query && req.query.name) || '');
  if (name === 'press-kit') return pressKit(req, res);
  if (name === 'article') {
    try { return await article(req, res); } catch (e) {
      console.error('article page failed', e && e.message);
      res.setHeader('Location', '/blog');
      return res.status(302).end();
    }
  }
  if (!PAGES[name]) return res.status(404).send('Not found');
  let html;
  try {
    html = fs.readFileSync(path.join(__dirname, '..', 'templates', name + '.html'), 'utf8');
  } catch (e) {
    return res.status(500).send('Temporarily unavailable');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const work = (async () => {
      // Loaded here, inside the safety net, so even a module that fails to load falls back
      const { supabase } = require('../lib/supabase');
      const { prerender } = require('../lib/prerender');
      const { jsonLdTag } = require('../lib/structured');
      const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).maybeSingle();
      if (error) throw error;
      const content = (data && data.data) || null;
      if (!content) throw new Error('no content');
      let out = await prerender(html, { url: SITE + PAGES[name], content });
      const ld = jsonLdTag(name, content);
      if (ld) out = out.replace('</head>', ld + '</head>');
      return out;
    })();
    const out = await Promise.race([work, new Promise((_, no) => setTimeout(() => no(new Error('prerender timeout')), BUDGET_MS))]);
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=86400');
    res.setHeader('X-Prerendered', '1');
    return res.status(200).send(out);
  } catch (e) {
    console.error('page prerender fallback', name, e && e.message);
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    res.setHeader('X-Prerendered', '0');
    return res.status(200).send(html);
  }
};
