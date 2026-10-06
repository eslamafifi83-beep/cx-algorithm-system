// GET /, /guests, /episodes, /blog   (vercel.json rewrites them here as ?name=index|guests|episodes|blog)
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

module.exports = async (req, res) => {
  const name = String((req.query && req.query.name) || '');
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
