// GET /sitemap.xml   (vercel.json rewrites it here)
// Lists every page, including one address per episode, straight from the saved content,
// so new episodes reach search engines without editing a file.
// GET /llms.txt      (rewritten here with ?format=llms): the same site map as plain text for AI assistants.
const { supabase } = require('../lib/supabase');
const { sitePaths, absolute } = require('../lib/site-urls');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

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

  const urls = sitePaths(content).map(p =>
    `  <url><loc>${esc(absolute(p))}</loc>${updated ? `<lastmod>${updated}</lastmod>` : ''}</url>`);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
};
