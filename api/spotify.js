// GET /api/spotify?url=<spotify episode link>   (admin only)
// Reads a Spotify episode and returns fields the admin can auto-fill:
//   { ok, title, description, about, date, duration, image, audio, source, note }
//
// Rich data (description, date, duration) needs a free Spotify Developer app:
//   set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Vercel.
// Without those it still returns title + cover image via the public oEmbed endpoint.
const { supabase, BUCKETS } = require('../lib/supabase');
const { isAdmin } = require('../lib/auth');

// Pull the episode id out of any Spotify episode URL/URI.
function episodeId(input) {
  const s = String(input || '').trim();
  let m = /episode[/:]([A-Za-z0-9]{22})/.exec(s);
  if (m) return m[1];
  m = /open\.spotify\.com\/[^/]*\/?episode\/([A-Za-z0-9]{22})/.exec(s);
  return m ? m[1] : null;
}

function formatDate(iso, precision) {
  if (!iso) return '';
  const parts = String(iso).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const y = parts[0];
  if (precision === 'year' || parts.length < 2) return y;
  const mo = months[parseInt(parts[1], 10) - 1] || '';
  if (precision === 'month' || parts.length < 3) return mo + ' ' + y;
  return mo + ' ' + parseInt(parts[2], 10) + ', ' + y;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return totalMin + ' min';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? h + ' hr ' + m + ' min' : h + ' hr';
}

// Strip HTML tags and collapse whitespace to a plain-text short blurb.
function shorten(text, max) {
  const plain = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const stop = cut.lastIndexOf('. ');
  if (stop > max * 0.5) return cut.slice(0, stop + 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut) + '…';
}

// Best-effort: copy the Spotify cover into our own storage so it is permanent.
// Falls back to the original Spotify URL if the copy fails for any reason.
async function rehostImage(url, id) {
  try {
    const r = await fetch(url);
    if (!r.ok) return url;
    const type = r.headers.get('content-type') || 'image/jpeg';
    const ext = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : '.jpg';
    const buf = Buffer.from(await r.arrayBuffer());
    const fileName = 'spotify-' + id + '-' + Date.now() + ext;
    const { error } = await supabase.storage.from(BUCKETS.images)
      .upload(fileName, buf, { contentType: type, upsert: true });
    if (error) return url;
    const { data: pub } = supabase.storage.from(BUCKETS.images).getPublicUrl(fileName);
    return pub.publicUrl || url;
  } catch (e) {
    return url;
  }
}

async function getToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const basic = Buffer.from(id + ':' + secret).toString('base64');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.access_token || null;
}

// Public fallback: title + cover only, no credentials needed.
async function viaOembed(url) {
  const r = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(url));
  if (!r.ok) return null;
  const j = await r.json();
  return { title: j.title || '', image: j.thumbnail_url || '' };
}

module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const url = (req.query && req.query.url) || '';
    const id = episodeId(url);
    if (!id) return res.status(400).json({ error: 'That doesn\'t look like a Spotify episode link.' });
    const canonicalUrl = 'https://open.spotify.com/episode/' + id;

    let out = { ok: true, title: '', description: '', about: '', date: '', duration: '', image: '', audio: canonicalUrl, source: '', note: '' };

    const token = await getToken();
    if (token) {
      const r = await fetch('https://api.spotify.com/v1/episodes/' + id + '?market=US', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (r.ok) {
        const ep = await r.json();
        const img = (ep.images && ep.images[0] && ep.images[0].url) || '';
        out.title = ep.name || '';
        out.about = String(ep.description || '').replace(/\s+\n/g, '\n').trim();
        out.description = shorten(ep.description, 180);
        out.date = formatDate(ep.release_date, ep.release_date_precision);
        out.duration = formatDuration(ep.duration_ms);
        out.image = img ? await rehostImage(img, id) : '';
        out.source = 'api';
        return res.status(200).json(out);
      }
    }

    // No credentials, or the API call didn't work — use the public oEmbed.
    const ob = await viaOembed(canonicalUrl);
    if (ob) {
      out.title = ob.title;
      out.image = ob.image ? await rehostImage(ob.image, id) : '';
      out.source = 'oembed';
      out.note = token
        ? 'Got the title and cover. Spotify didn\'t return full details for this episode — add the description, date and duration by hand.'
        : 'Got the title and cover. Add Spotify API keys in Vercel to also auto-fill the description, date and duration.';
      return res.status(200).json(out);
    }

    return res.status(502).json({ error: 'Could not read that episode from Spotify. Check the link and try again.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
