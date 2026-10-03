// GET /api/episode-meta?ids=<spotifyEpisodeId>,<id>,...   (public, cached)
// Spotify details the episode pages need but the admin doesn't store:
//   { ok, spotify: { keys, token, api }, episodes: { <id>: { durationMs, releaseDate, description, video, frame } } }
// Notes come from the podcast RSS feed; duration and date from the feed, Spotify's API (with keys) or its public embed page.
// Only ids that appear in the site's own episode list are looked up, so this can't be
// used as an open Spotify proxy. Responses are cached at the edge for hours.
const { supabase } = require('../lib/supabase');
const { fromEmbedPage, oembed } = require('../lib/spotify-meta');
const { feedItems, matchItem } = require('../lib/podcast-feed');
const fs = require('fs');
const path = require('path');

// What came with a reviewed transcript (transcripts/<id>.json): chapters, takeaways, resources, guest quote
function transcriptExtras(id) {
  try {
    const tx = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'transcripts', id + '.json'), 'utf8'));
    return {
      chapters: Array.isArray(tx.chapters) ? tx.chapters.filter(c => c && c.title && c.t >= 0).map(c => ({ t: Math.round(c.t), title: String(c.title) })) : [],
      takeaways: Array.isArray(tx.takeaways) ? tx.takeaways.filter(Boolean).map(String) : [],
      resources: Array.isArray(tx.resources) ? tx.resources.filter(r => r && r.label).map(r => ({ label: String(r.label), url: r.url || '', note: r.note || '' })) : [],
      quote: tx.quote && tx.quote.text ? String(tx.quote.text) : ''
    };
  } catch (e) {
    return null;
  }
}

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

    // The podcast feed: each episode's own notes and learning points (cleaner than Spotify's
    // description, which repeats the show boilerplate), plus date and duration
    const feed = ids.length ? await feedItems(2500) : [];
    ((data && data.data && data.data.episodes) || []).forEach((ep, i) => {
      const m = /episode[/:]([A-Za-z0-9]{22})/.exec(String((ep && ep.audio) || '') + ' ' + String((ep && ep.video) || ''));
      const e = m && episodes[m[1]];
      if (!e || e.fromFeed) return;
      const item = matchItem(feed, ep.title, parseInt((/\d+/.exec(ep.eyebrow || '') || [i + 1])[0], 10));
      if (!item) return;
      e.fromFeed = true;
      if (item.notes.length) e.description = item.notes.join('\n\n');
      if (item.learn.length) e.learn = item.learn;
      if (!e.durationMs) e.durationMs = item.durationMs;
      if (!e.releaseDate) e.releaseDate = item.releaseDate;
    });

    ids.forEach(id => {
      const x = transcriptExtras(id);
      if (!x) return;
      const e = episodes[id];
      if (x.chapters.length) e.chapters = x.chapters;
      if (!(e.learn && e.learn.length) && x.takeaways.length) e.learn = x.takeaways;  // the feed's own list wins
      if (x.resources.length) e.resources = x.resources;
      if (x.quote) e.quote = x.quote;
    });

    const missing = ids.filter(id => !episodes[id].durationMs);
    const pages = await Promise.all(missing.map(id => fromEmbedPage(id)));
    missing.forEach((id, i) => {
      if (pages[i].durationMs) episodes[id].durationMs = pages[i].durationMs;
      if (pages[i].releaseDate && !episodes[id].releaseDate) episodes[id].releaseDate = pages[i].releaseDate;
    });

    const looks = await Promise.all(ids.map(id => oembed(id)));
    ids.forEach((id, i) => Object.assign(episodes[id], looks[i]));

    // Cache a complete answer for hours; an incomplete one only briefly so a fix shows up fast
    const complete = ids.every(id => episodes[id].durationMs);
    res.setHeader('Cache-Control', complete ? 'public, s-maxage=21600, stale-while-revalidate=86400' : 'public, s-maxage=300');
    return res.status(200).json({ ok: true, spotify: status, episodes });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
