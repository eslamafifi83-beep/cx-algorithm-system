/*
 * Shared by episodes.html and episode.html.
 *   CXEp.normalize(content)  -> { episodes, links } with numbers, Spotify ids, guest identity, chapters
 *   CXEp.loadMeta(episodes)  -> Spotify details (duration, release date, description, video) from /api/episode-meta
 *   CXEp.applyMeta(ep, meta) -> fills ep.seconds / ep.released / ep.hasVideo / ep.blurb / ep.aboutParas
 * plus formatting and markup helpers. Needs assets/guest-identity.js loaded first.
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const norm = s => String(s || '').trim().toLowerCase();
  const pad = n => String(n).padStart(2, '0');

  // Blurbs from the original website template that may still sit on early episodes
  const FILLER = /^(Crafting identities that stand out|Designing seamless digital experiences|Transforming ideas into designs)/i;
  const AUDIO_FILE = /\.(mp3|m4a|aac|wav|ogg|oga)(\?|#|$)/i;
  const VIDEO_FILE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

  const spotifyId = v => { const m = /episode[/:]([A-Za-z0-9]{22})/.exec(String(v || '')); return m ? m[1] : ''; };
  const epNum = (ep, i) => { const m = /\d+/.exec(ep.eyebrow || ''); return (m ? m[0] : String(i + 1)).padStart(2, '0'); };
  const lines = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean);
  const paras = v => String(v || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const topicKey = t => String(t || '').toLowerCase().split(/\s*(?:&|\/|,|\band\b)\s*/).map(s => s.trim()).filter(Boolean).sort().join('|');

  function toSeconds(ts) {
    const parts = String(ts || '').trim().split(':').map(Number);
    if (parts.length < 2 || parts.some(n => isNaN(n))) return null;
    return parts.reduce((a, v) => a * 60 + v, 0);
  }
  // "47 min", "1 hr 5 min", "33:12" -> seconds
  function durationText(t) {
    const s = String(t || '').toLowerCase();
    const clock = toSeconds(s);
    if (clock != null) return clock;
    const h = /(\d+)\s*h/.exec(s), m = /(\d+)\s*m/.exec(s);
    return h || m ? (h ? +h[1] * 3600 : 0) + (m ? +m[1] * 60 : 0) : 0;
  }
  const clock = s => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };
  const minutes = s => s ? (s >= 3600 ? `${Math.floor(s / 3600)} hr ${Math.round(s % 3600 / 60)} min` : `${Math.round(s / 60)} min`) : '';
  const isoDate = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(iso + 'T12:00:00') : null;
  const dayLabel = (iso, fallback) => { const d = isoDate(iso); return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : (fallback || ''); };
  const monthLabel = (iso, fallback) => { const d = isoDate(iso); return d ? d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : String(fallback || '').replace(/,/g, ''); };

  function shorten(text, max) {
    const plain = String(text || '').replace(/\s+/g, ' ').trim();
    if (plain.length <= max) return plain;
    const cut = plain.slice(0, max), stop = cut.lastIndexOf('. ');
    if (stop > max * 0.5) return cut.slice(0, stop + 1);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }

  // The guest on an episode: the episode's guest name first, else the guest card whose
  // episode label carries this episode's number.
  function guestFor(ep, n, guests, companies) {
    const name = norm(ep.guest);
    let g = name ? guests.find(x => norm(x.name) === name) : null;
    if (!g && !name) g = guests.find(x => { const m = /\d+/.exec(x.episodeLabel || ''); return m && m[0].padStart(2, '0') === n; });
    if (!g && !name) return null;
    const src = g || { name: ep.guest, role: ep.role };
    const id = window.CXGuest ? window.CXGuest.identity(src, companies) : { title: src.role || '', company: '', logo: '', accent: '#E9A33D' };
    const num = (v, d) => (v === '' || v == null || isNaN(Number(v))) ? d : Number(v);
    return {
      name: String(src.name || '').trim(),
      title: id.title, company: id.company, logo: id.logo, accent: id.accent,
      photo: (g && g.photo) || '',
      focus: `${num(g && g.photoX, 50)}% ${num(g && g.photoY, 18)}%`,
      zoom: num(g && g.photoZoom, 100) / 100,
      bio: String((g && g.bio) || ep.guestBio || '').trim(),
      quote: String(ep.guestQuote || '').trim(),
      linkedIn: (g && g.linkedInUrl) || '',
      topic: (g && g.category) || ''
    };
  }

  function normalize(c) {
    const guests = c && c.guests && Array.isArray(c.guests.items) ? c.guests.items : [];
    const companies = c && c.marquee && Array.isArray(c.marquee.items) ? c.marquee.items.filter(x => x && typeof x === 'object') : [];
    const seen = new Set();
    const episodes = (c && Array.isArray(c.episodes) ? c.episodes : []).map((ep, idx) => {
      const n = epNum(ep, idx);
      const sid = spotifyId(ep.audio) || spotifyId(ep.video);
      const description = FILLER.test(ep.description || '') ? '' : String(ep.description || '').trim();
      const e = {
        idx, n, sid,
        title: String(ep.title || '').trim() || 'Untitled episode',
        image: ep.image || '',
        audioFile: AUDIO_FILE.test(ep.audio || '') ? ep.audio : '',
        videoFile: VIDEO_FILE.test(ep.video || '') ? ep.video : '',
        dateText: ep.date || '',
        durationText: ep.duration || '',
        description,
        about: paras(ep.about).filter(p => !/^episode description:?$/i.test(p)),
        learn: lines(ep.takeaways).filter(l => !/learn:?$/i.test(l)),
        chapters: lines(ep.chapters).map(l => {
          const i = l.indexOf('|');
          const ts = (i < 0 ? '' : l.slice(0, i)).trim(), t = toSeconds(ts);
          return t == null ? null : { t, ts, label: l.slice(i + 1).trim() };
        }).filter(Boolean).sort((a, b) => a.t - b.t),
        resources: lines(ep.resources).map(l => { const i = l.indexOf('|'); return i < 0 ? { label: l, url: '' } : { label: l.slice(0, i).trim(), url: l.slice(i + 1).trim() }; }),
        guest: guestFor(ep, n, guests, companies)
      };
      e.topic = e.guest ? e.guest.topic : '';
      e.dup = !!sid && seen.has(sid);
      if (sid) seen.add(sid);
      applyMeta(e, null);
      return e;
    });
    // "AI & Data" and "Data & AI" are one topic: show one spelling everywhere
    const label = {};
    episodes.forEach(e => { const k = topicKey(e.topic); if (k && !label[k]) label[k] = e.topic; });
    episodes.forEach(e => { const k = topicKey(e.topic); if (k) e.topic = label[k]; });
    return { episodes, links: (c && c.links) || {} };
  }

  async function loadMeta(episodes) {
    const ids = [...new Set(episodes.map(e => e.sid).filter(Boolean))].sort();
    if (!ids.length) return {};
    try {
      const r = await fetch('/api/episode-meta?ids=' + ids.join(','));
      if (!r.ok) return {};
      const j = await r.json();
      return (j && j.episodes) || {};
    } catch (e) {
      return {};
    }
  }

  function applyMeta(e, m) {
    m = m || {};
    e.seconds = m.durationMs ? Math.round(m.durationMs / 1000) : durationText(e.durationText);
    e.released = m.releaseDate || '';
    // Unknown (details unavailable) counts as "has video" for Spotify episodes; the player re-checks
    e.hasVideo = !!e.videoFile || (!!e.sid && m.video !== false);
    e.frame = m.frame || '';
    e.blurb = e.description || shorten(m.description, 240);
    e.aboutParas = e.about.length ? e.about : (e.description ? paras(e.description) : (m.description ? [String(m.description).trim()] : []));
    e.dayLabel = dayLabel(e.released, e.dateText);
    e.monthLabel = monthLabel(e.released, e.dateText);
    return e;
  }

  const smart = (src, alt, eager) => src
    ? `<span class="smart"><img class="sb" src="${esc(src)}" alt="" aria-hidden="true"${eager ? '' : ' loading="lazy"'} /><img class="sf" src="${esc(src)}" alt="${esc(alt || '')}"${eager ? '' : ' loading="lazy"'} /></span>`
    : `<span class="smart empty" aria-hidden="true"><span class="eqmark"><i></i><i></i><i></i><i></i><i></i></span></span>`;

  function avatar(g, size) {
    if (!g) return '';
    const inner = g.photo
      ? `<img src="${esc(g.photo)}" alt="" loading="lazy" style="object-position:${g.focus};transform-origin:${g.focus};transform:scale(${g.zoom})" />`
      : `<b>${esc(g.name.split(/\s+/).filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase())}</b>`;
    return `<span class="av" style="width:${size}px;height:${size}px">${inner}</span>`;
  }
  const plate = g => g && g.logo ? `<span class="plate"><img src="${esc(g.logo)}" alt="${esc(g.company)}" /></span>` : '';

  // Logos uploaded with a wide empty border look tiny on a plate: crop to the artwork.
  // Two-line (stacked) logos get the class "stack" so the page can give them more height.
  const trimmed = {};
  function applyLogo(src) {
    const t = trimmed[src];
    document.querySelectorAll('.plate img').forEach(im => {
      if (im.dataset.src !== src) return;
      if (t.url !== src && im.getAttribute('src') !== t.url) im.src = t.url;
      im.classList.toggle('stack', t.ratio < 2.4);
    });
  }
  function trimLogos(root) {
    (root || document).querySelectorAll('.plate img').forEach(img => {
      const src = img.dataset.src || img.getAttribute('src');
      if (!src) return;
      img.dataset.src = src;
      if (trimmed[src]) { if (trimmed[src] !== 'pending') applyLogo(src); return; }
      trimmed[src] = 'pending';
      const probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.onload = () => {
        const w = probe.naturalWidth, h = probe.naturalHeight;
        trimmed[src] = { url: src, ratio: w && h ? w / h : 4 };
        try {
          if (/\.svg(\?|$)/i.test(src) || !w || !h || w * h > 16e6) throw 0;
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(probe, 0, 0);
          const d = cx.getImageData(0, 0, w, h).data;
          const px = (x, y) => { const k = (y * w + x) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; };
          const cs = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
          const bg = [0, 1, 2, 3].map(k => cs.reduce((s, p) => s + p[k], 0) / 4);
          const hit = (x, y) => { const p = px(x, y); if (bg[3] < 40) return p[3] > 40; if (p[3] < 40) return false; return Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 90; };
          let t = h, l = w, r = -1, b = -1;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hit(x, y)) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
          if (r - l < 8 || b - t < 8) throw 0;
          const p = Math.round(Math.max(r - l, b - t) * 0.04);
          l = Math.max(0, l - p); t = Math.max(0, t - p); r = Math.min(w - 1, r + p); b = Math.min(h - 1, b + p);
          const cw = r - l + 1, ch = b - t + 1;
          trimmed[src].ratio = cw / ch;
          if (cw * ch <= w * h * 0.85) {
            const o = document.createElement('canvas'); o.width = cw; o.height = ch;
            o.getContext('2d').drawImage(probe, l, t, cw, ch, 0, 0, cw, ch);
            trimmed[src].url = o.toDataURL('image/png');
          }
        } catch (err) { /* keep the original */ }
        applyLogo(src);
      };
      probe.onerror = () => { trimmed[src] = { url: src, ratio: 4 }; };
      probe.src = src;
    });
  }

  window.CXEp = { esc, normalize, loadMeta, applyMeta, smart, avatar, plate, trimLogos, clock, minutes, toSeconds, topicKey, shorten };
})();
