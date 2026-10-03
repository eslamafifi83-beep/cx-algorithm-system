// Public Spotify details that need no API keys. Used by /api/episode-meta and the episode pages.

// Spotify's public embed page carries the duration and release date
async function fromEmbedPage(id, timeoutMs) {
  const ctrl = timeoutMs ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const r = await fetch('https://open.spotify.com/embed/episode/' + id, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheCXAlgorithm/1.0)' },
      signal: ctrl ? ctrl.signal : undefined
    });
    if (!r.ok) return {};
    const html = await r.text();
    const d = /"duration":(\d+)/.exec(html);
    const rel = /"releaseDate":\{"isoString":"(\d{4}-\d{2}-\d{2})/.exec(html);
    return { durationMs: d ? Number(d[1]) : 0, releaseDate: rel ? rel[1] : '' };
  } catch (e) {
    return {};
  } finally {
    if (timer) clearTimeout(timer);
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

module.exports = { fromEmbedPage, oembed };
