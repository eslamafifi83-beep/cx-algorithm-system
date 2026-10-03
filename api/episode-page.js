// GET /episodes/<address>   (vercel.json rewrites it here; also /episode?ep=N, the old player address)
// Serves each episode as its own page, with its title, description, share image and structured
// data already in the HTML, so search engines and link previews see the episode without running
// JavaScript. Cached at the edge for 5 minutes, so admin edits show up quickly.
const { supabase } = require('../lib/supabase');
const { route, render, notFoundPage, spotifyId } = require('../lib/episode-page');
const { fromEmbedPage } = require('../lib/spotify-meta');

module.exports = async (req, res) => {
  const q = req.query || {};
  let content;
  try {
    const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).maybeSingle();
    if (error) throw error;
    content = (data && data.data) || {};
  } catch (e) {
    content = null;
  }

  if (!content) {
    // Content store unreachable: send the plain player, which finds the episode from the address itself
    try {
      const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'templates', 'episode.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=10');
      return res.status(200).send(html);
    } catch (e) {
      return res.status(500).send('Temporarily unavailable');
    }
  }

  const to = route(content, q.slug, q);
  if (to.location) {
    res.setHeader('Location', to.location);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(to.permanent ? 301 : 302).end();
  }
  if (!(to.idx >= 0)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(404).send(notFoundPage());
  }

  const ep = content.episodes[to.idx] || {};
  const sid = spotifyId(ep.audio) || spotifyId(ep.video);
  const meta = sid ? await fromEmbedPage(sid, 1500) : {};
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return res.status(200).send(render(content, to.idx, meta));
};
