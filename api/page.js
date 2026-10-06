// GET /, /guests, /episodes, /blog   (vercel.json rewrites them here as ?name=index|guests|episodes|blog)
// Sends each page already filled in with the live guests, episodes and articles (lib/prerender runs
// the page's own scripts on the server), plus structured data, so search engines and AI assistants
// that don't run JavaScript see the full page. Visitors get the same page as before: their browser
// runs the same scripts. If anything fails, the untouched page is sent, exactly as before.
const fs = require('fs');
const path = require('path');
const { supabase } = require('../lib/supabase');
const { prerender } = require('../lib/prerender');
const { jsonLdTag } = require('../lib/structured');
const { SITE } = require('../lib/site-urls');

const PAGES = { index: '/', guests: '/guests', episodes: '/episodes', blog: '/blog' };

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
    const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).maybeSingle();
    if (error) throw error;
    const content = (data && data.data) || null;
    if (!content) throw new Error('no content');
    let out = await prerender(html, { url: SITE + PAGES[name], content });
    const ld = jsonLdTag(name, content);
    if (ld) out = out.replace('</head>', ld + '</head>');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=86400');
    return res.status(200).send(out);
  } catch (e) {
    // Same page the site served before prerendering existed
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(200).send(html);
  }
};
