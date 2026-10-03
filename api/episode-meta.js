// GET /api/episode-meta?ids=<spotifyEpisodeId>,<id>,...   (public, cached)
// Spotify details the episode pages need but the admin doesn't store:
//   { ok, spotify: { keys, token, api }, episodes: { <id>: { durationMs, releaseDate, description, video, frame } } }
// Descriptions need SPOTIFY_CLIENT_ID/SECRET in Vercel; duration and date fall back to the public embed page.
// Only ids that appear in the site's own episode list are looked up, so this can't be
// used as an open Spotify proxy. Responses are cached at the edge for hours.
const { supabase } = require('../lib/supabase');

const ID = /^[A-Za-z0-9]{22}$/;

function idsInContent(content) {
  const out = new Set();
  (content && Array.isArray(content.episodes) ? content.episodes : []).forEach(ep => {
    [ep && ep.audio, ep && ep.video].forEach(v => {
      const m = /episode[/:]([A-Za-z0-9]{22})/.exec(String(v || ''));
      if (m) out.add(m[1]);
    });
  });
  return out;
}

// `status` collects HTTP status codes only (never keys), so a missing detail can be traced
// from the response.
async function getToken(status) {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  status.keys = !!(id && secret);
  if (!id || !secret) return null;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(id.trim() + ':' + secret.trim()).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  status.token = r.status;
  if (!r.ok) return null;
  return (await r.json()).access_token || null;
}

async function episodeDetails(id, token, status) {
  const r = await fetch('https://api.spotify.com/v1/episodes/' + id + '?market=US', { headers: { 'Authorization': 'Bearer ' + token } });
  status.api = status.api && status.api !== 200 ? status.api : r.status;
  return r.ok ? r.json() : null;
}

// Without API keys: Spotify's public embed page carries the duration and release date
async function fromEmbedPage(id) {
  try {
    const r = await fetch('https://open.spotify.com/embed/episode/' + id, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheCXAlgorithm/1.0)' } });
    if (!r.ok) return {};
    const html = await r.text();
    const d = /"duration":(\d+)/.exec(html);
    const rel = /"releaseDate":\{"isoString":"(\d{4}-\d{2}-\d{2})/.exec(html);
    return { durationMs: d ? Number(d[1]) : 0, releaseDate: rel ? rel[1] : '' };
  } catch (e) {
    return {};
  }
}

// oEmbed says whether Spotify has a video version, and gives its first frame
async function oembed(id) {
  try {
    const r = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent('spotify:episode:' + id));
    if (!r.ok) return {};
    const j = await r.json();
    return { video: j.type === 'video', frame: j.thumbnail_url || '' };
  } catch (e) {
    return {};
  }
}

module.exports = async (req, res) => {
  try {
    const asked = String((req.query && req.query.ids) || '').split(',').map(s => s.trim()).filter(s => ID.test(s));
    const unique = [...new Set(asked)].slice(0, 50);
    if (!unique.length) return res.status(400).json({ error: 'Pass ?ids= with Spotify episode ids.' });

    const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).maybeSingle();
    if (error) throw error;
    const known = idsInContent(data && data.data);
    const ids = unique.filter(id => known.has(id));

    const episodes = {};
    ids.forEach(id => { episodes[id] = {}; });

    const status = { keys: false, token: 0, api: 0 };
    const token = ids.length ? await getToken(status) : null;
    const details = token ? await Promise.all(ids.map(id => episodeDetails(id, token, status).catch(() => null))) : [];
    details.forEach(ep => {
      if (!ep || !episodes[ep.id]) return;
      Object.assign(episodes[ep.id], {
        durationMs: ep.duration_ms || 0,
        releaseDate: ep.release_date || '',
        description: String(ep.description || '').trim()
      });
    });

    const missing = ids.filter(id => !episodes[id].durationMs);
    const pages = await Promise.all(missing.map(fromEmbedPage));
    missing.forEach((id, i) => {
      if (pages[i].durationMs) episodes[id].durationMs = pages[i].durationMs;
      if (pages[i].releaseDate && !episodes[id].releaseDate) episodes[id].releaseDate = pages[i].releaseDate;
    });

    const looks = await Promise.all(ids.map(oembed));
    ids.forEach((id, i) => Object.assign(episodes[id], looks[i]));

    // Cache a complete answer for hours; an incomplete one only briefly so a fix shows up fast
    const complete = ids.every(id => episodes[id].durationMs);
    res.setHeader('Cache-Control', complete ? 'public, s-maxage=21600, stale-while-revalidate=86400' : 'public, s-maxage=300');
    return res.status(200).json({ ok: true, spotify: status, episodes });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
