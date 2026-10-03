// Server-rendered episode pages at /episodes/<address>.
// Fills the player page (templates/episode.html) with the episode's own title, description,
// share image and structured data, plus a plain-HTML copy of the episode notes for search
// engines and visitors without JavaScript. The player script replaces that copy when it loads.
const fs = require('fs');
const path = require('path');
const { episodeSlugs } = require('../assets/links.js');
const { SITE } = require('./site-urls');

const SHOW = 'The CX Algorithm Podcast';
const HOST = 'Dr Eslam Afifi';
const DEFAULT_IMAGE = SITE + '/assets/og-image.png';
// Blurbs from the original website template that may still sit on early episodes
const FILLER = /^(Crafting identities that stand out|Designing seamless digital experiences|Transforming ideas into designs)/i;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const paras = v => String(v || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
const lines = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean);
const spotifyId = v => { const m = /episode[/:]([A-Za-z0-9]{22})/.exec(String(v || '')); return m ? m[1] : ''; };
const epNum = (ep, i) => { const m = /\d+/.exec((ep && ep.eyebrow) || ''); return (m ? m[0] : String(i + 1)).padStart(2, '0'); };
const absUrl = u => !u ? '' : /^https?:\/\//i.test(u) ? u : SITE + '/' + String(u).replace(/^\.?\/+/, '');
// JSON inside <script>: keep "</script>" in the text from closing the tag
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');

function shorten(text, max) {
  const plain = clean(text);
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max), stop = cut.lastIndexOf('. ');
  if (stop > max * 0.7) return cut.slice(0, stop + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '') + '…';
}

// "47 min", "1 hr 5 min", "33:12" -> seconds
function durationText(t) {
  const s = String(t || '').toLowerCase().trim();
  const parts = s.split(':').map(Number);
  if (parts.length > 1 && !parts.some(n => isNaN(n))) return parts.reduce((a, v) => a * 60 + v, 0);
  const h = /(\d+)\s*h/.exec(s), m = /(\d+)\s*m/.exec(s);
  return (h ? +h[1] * 3600 : 0) + (m ? +m[1] * 60 : 0);
}
const minutes = s => !s ? '' : s >= 3600 ? `${Math.floor(s / 3600)} hr ${Math.round(s % 3600 / 60)} min` : `${Math.round(s / 60)} min`;
const isoDuration = s => 'PT' + (s >= 3600 ? Math.floor(s / 3600) + 'H' : '') + (s % 3600 >= 60 ? Math.floor(s % 3600 / 60) + 'M' : '') + (s % 60 ? s % 60 + 'S' : '');
const dayLabel = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || '')
  ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

// Literal paths so Vercel's bundler ships these files with the function
let template = '', missing = '';
const readTemplate = () => template || (template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'episode.html'), 'utf8'));

function notFoundPage() {
  try { return missing || (missing = fs.readFileSync(path.join(__dirname, '..', '404.html'), 'utf8')); } catch (e) {
    return '<!doctype html><meta charset="utf-8"><title>Page not found — The CX Algorithm Podcast</title><p>This page could not be found. <a href="/episodes">Browse all episodes</a></p>';
  }
}

// The episode's guest: its guest name first, else the guest card whose episode label carries this number
function guestOf(ep, n, guests) {
  const name = clean(ep.guest).toLowerCase();
  let g = name ? guests.find(x => clean(x && x.name).toLowerCase() === name) : null;
  if (!g && !name) g = guests.find(x => { const m = /\d+/.exec((x && x.episodeLabel) || ''); return m && m[0].padStart(2, '0') === n; });
  if (!g && !name) return null;
  const role = clean((g && g.role) || ep.role), company = clean(g && g.company);
  return {
    name: clean(g ? g.name : ep.guest),
    role, company,
    line: [role, company].filter(Boolean).join(', '),
    bio: String((g && g.bio) || ep.guestBio || '').trim(),
    linkedIn: (g && g.linkedInUrl) || ''
  };
}

// Decide what an address shows: { idx } for an episode page, { location, permanent } for a redirect,
// or {} when there's no such episode.
function route(content, slug, query) {
  const episodes = content && Array.isArray(content.episodes) ? content.episodes : [];
  const slugs = episodeSlugs(episodes);
  const keep = new URLSearchParams();
  ['mode', 't'].forEach(k => { const v = query && query[k]; if (typeof v === 'string' && v && v.length < 20) keep.set(k, v); });
  const to = i => '/episodes/' + slugs[i] + (keep.toString() ? '?' + keep : '');
  const raw = String(slug || '').trim();

  if (!raw) {
    // The old player address: /episode?ep=<position in the list>; without one, the latest episode
    const i = parseInt(query && query.ep, 10);
    if (slugs[i]) return { location: to(i), permanent: true };
    return { location: slugs.length ? to(slugs.length - 1) : '/episodes', permanent: false };
  }
  if (slugs.includes(raw)) return { idx: slugs.indexOf(raw) };
  const s = raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (slugs.includes(s)) return { location: to(slugs.indexOf(s)), permanent: true };
  // Short forms: /episodes/8, /episodes/ep-8, /episodes/episode-08
  const num = /^(?:ep|episode)?-?0*(\d{1,3})$/.exec(s);
  if (num) {
    const i = episodes.findIndex((ep, k) => Number(epNum(ep, k)) === Number(num[1]));
    if (i >= 0) return { location: to(i), permanent: false };
  }
  // An address shared before its title was edited: the episode whose address starts the same way
  const words = s.split('-');
  if (words.length >= 4) {
    const lead = x => { const w = x.split('-'); let k = 0; while (k < w.length && w[k] === words[k]) k++; return k; };
    let best = -1, bestLead = 3;
    slugs.forEach((x, i) => { const k = lead(x); if (k > bestLead) { best = i; bestLead = k; } });
    if (best >= 0) return { location: to(best), permanent: true };
  }
  return {};
}

function describe(content, idx, meta) {
  const episodes = content.episodes;
  const ep = episodes[idx] || {};
  const slugs = episodeSlugs(episodes);
  const n = epNum(ep, idx);
  const guests = content.guests && Array.isArray(content.guests.items) ? content.guests.items : [];
  const guest = guestOf(ep, n, guests);
  const title = clean(ep.title) || 'Episode ' + Number(n);
  const url = SITE + '/episodes/' + slugs[idx];
  const sid = spotifyId(ep.audio) || spotifyId(ep.video);
  const description = FILLER.test(ep.description || '') ? '' : String(ep.description || '').trim();
  const about = paras(ep.about).filter(p => !/^episode description:?$/i.test(p));
  // Admin text first; otherwise the episode notes from the podcast feed (meta.notes / meta.learn)
  const own = about.length ? about : paras(description);
  const notes = own.length ? own : (Array.isArray(meta.notes) ? meta.notes : []);
  const ownLearn = lines(ep.takeaways).filter(l => !/learn:?$/i.test(l)).map(l => l.replace(/^[-•*✓✔·]\s*/, ''));
  const learn = ownLearn.length ? ownLearn : (Array.isArray(meta.learn) ? meta.learn : []);
  const chapters = lines(ep.chapters).map(l => {
    const i = l.indexOf('|');
    return i < 0 ? null : { ts: l.slice(0, i).trim(), label: l.slice(i + 1).trim() };
  }).filter(c => c && /^\d{1,2}(:\d{2}){1,2}$/.test(c.ts));
  const resources = lines(ep.resources).map(l => {
    const i = l.indexOf('|');
    return i < 0 ? { label: l, url: '' } : { label: l.slice(0, i).trim(), url: l.slice(i + 1).trim() };
  });
  const seconds = meta.durationMs ? Math.round(meta.durationMs / 1000) : durationText(ep.duration);
  const released = meta.releaseDate || '';
  const summary = clean(description || notes[0] || '');
  const fallback = `Episode ${Number(n)} of ${SHOW}${guest ? ` with ${guest.name}` : ''}: ${title}${/[.!?]$/.test(title) ? '' : '.'} Listen or watch with ${HOST}.`;
  const lead = guest ? `With ${guest.name}${guest.company ? ` (${guest.company})` : ''}. ` : '';
  const others = episodes.map((x, i) => ({ i, title: clean(x && x.title) || 'Episode ' + Number(epNum(x, i)), url: '/episodes/' + slugs[i] }))
    .filter(o => o.i !== idx).reverse();
  return {
    idx, n, title, url, sid, guest, notes, learn, chapters, resources, seconds, released, others,
    image: absUrl(ep.image) || DEFAULT_IMAGE,
    pageTitle: `${title} | ${SHOW}`,
    description: summary ? shorten(lead + summary, 158) : shorten(fallback, 158),
    longDescription: shorten(notes.join(' ') || summary || fallback, 600),
    date: dayLabel(released) || clean(ep.date).replace(/,/g, '')
  };
}

function headTags(v) {
  const t = esc(v.pageTitle), d = esc(v.description), u = esc(v.url), img = esc(v.image);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" id="canonicalLink" href="${u}" />`,
    `<meta name="theme-color" content="#0C1128" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${SHOW}" />`,
    `<meta property="og:title" content="${esc(v.title)}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:alt" content="${esc('Cover art: ' + v.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(v.title)}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`
  ].join('\n');
}

function structuredData(v) {
  const g = v.guest;
  const episode = {
    '@type': 'PodcastEpisode',
    '@id': v.url + '#episode',
    url: v.url,
    name: v.title,
    episodeNumber: Number(v.n),
    description: v.longDescription,
    image: v.image,
    inLanguage: 'en',
    partOfSeries: { '@type': 'PodcastSeries', '@id': SITE + '/#podcast', name: 'The CX Algorithm', url: SITE + '/' },
    author: { '@type': 'Person', '@id': SITE + '/about#person', name: HOST, url: SITE + '/about' }
  };
  if (v.released) episode.datePublished = v.released;
  if (v.seconds) episode.timeRequired = isoDuration(v.seconds);
  if (g && g.name) {
    episode.contributor = { '@type': 'Person', name: g.name };
    if (g.role) episode.contributor.jobTitle = g.role;
    if (g.company) episode.contributor.worksFor = { '@type': 'Organization', name: g.company };
    if (g.linkedIn) episode.contributor.sameAs = [g.linkedIn];
  }
  if (v.sid) {
    episode.associatedMedia = { '@type': 'MediaObject', url: 'https://open.spotify.com/episode/' + v.sid, embedUrl: 'https://open.spotify.com/embed/episode/' + v.sid };
    episode.sameAs = ['https://open.spotify.com/episode/' + v.sid];
  }
  const crumbs = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Episodes', item: SITE + '/episodes' },
      { '@type': 'ListItem', position: 3, name: v.title, item: v.url }
    ]
  };
  return `<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': [episode, crumbs] })}</script>`;
}

// The readable copy of the episode that sits in <main> until the player takes over
function notesHTML(v) {
  const g = v.guest;
  const kicker = ['Episode ' + v.n, v.date, minutes(v.seconds)].filter(Boolean).join(' · ');
  const out = [
    `<article class="ssr-ep">`,
    `<nav class="ssr-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/episodes">Episodes</a></nav>`,
    `<p class="ssr-kicker">${esc(kicker)}</p>`,
    `<h1>${esc(v.title)}</h1>`
  ];
  if (g && g.name) out.push(`<p class="ssr-guest">With <strong>${esc(g.name)}</strong>${g.line ? ', ' + esc(g.line) : ''}</p>`);
  v.notes.forEach(p => out.push(`<p>${esc(p)}</p>`));
  if (v.learn.length) out.push(`<h2>In this episode</h2><ul>${v.learn.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`);
  if (v.chapters.length) out.push(`<h2>Chapters</h2><ol>${v.chapters.map(c => `<li><span>${esc(c.ts)}</span> ${esc(c.label)}</li>`).join('')}</ol>`);
  if (g && g.bio) out.push(`<h2>About ${esc(g.name)}</h2>${paras(g.bio).map(p => `<p>${esc(p)}</p>`).join('')}`);
  const res = v.resources.filter(r => r.label);
  if (res.length) out.push(`<h2>Resources</h2><ul>${res.map(r => `<li>${/^https?:\/\//i.test(r.url) ? `<a href="${esc(r.url)}" rel="noopener">${esc(r.label)}</a>` : esc(r.label)}</li>`).join('')}</ul>`);
  out.push(`<p class="ssr-listen">${v.sid ? `<a href="https://open.spotify.com/episode/${esc(v.sid)}" rel="noopener">Listen on Spotify</a> · ` : ''}<a href="/episodes">All episodes</a></p>`);
  if (v.others.length) out.push(`<h2>More episodes</h2><ul>${v.others.map(o => `<li><a href="${esc(o.url)}">${esc(o.title)}</a></li>`).join('')}</ul>`);
  out.push(`</article>`);
  return out.join('\n');
}

const STYLE = `<style>
  .ssr-ep { max-width: 760px; margin: 0 auto; padding: clamp(6.5rem, 14vw, 8.5rem) 1.25rem 4rem; color: #E9ECF5; line-height: 1.7; }
  .ssr-ep h1 { font-size: clamp(1.8rem, 4.2vw, 2.6rem); line-height: 1.15; margin: .5rem 0 1rem; }
  .ssr-ep h2 { font-size: 1.15rem; margin: 2rem 0 .6rem; }
  .ssr-ep p, .ssr-ep li { color: rgba(233,236,245,.82); }
  .ssr-ep a { color: #E9A33D; }
  .ssr-ep ul, .ssr-ep ol { padding-left: 1.2rem; }
  .ssr-crumbs, .ssr-kicker { font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; opacity: .75; margin: 0; }
</style>`;

function render(content, idx, meta) {
  const v = describe(content, idx, meta || {});
  let html = readTemplate();
  const swap = (re, str) => { const before = html; html = html.replace(re, () => str); if (html === before) console.warn('[episode-page] template marker missing:', re); };
  swap(/<title>[\s\S]*?<meta name="twitter:image"[^>]*>/, headTags(v));
  swap(/<\/head>/, structuredData(v) + '\n' + STYLE + '\n</head>');
  swap(/<main id="page"><\/main>/, `<main id="page">${notesHTML(v)}</main>\n<script>window.__EP_IDX = ${Number(idx)};</script>`);
  return html;
}

module.exports = { route, render, describe, notFoundPage, spotifyId, epNum };
