// The podcast's public RSS feed (Spotify for Creators): release date, duration and the episode
// notes for every episode. Used when an episode's description or "what you'll learn" list hasn't
// been filled in the admin, so every episode page has real text without any copy-pasting.
// Only the episode's own description and learning points are taken; the boilerplate after them
// (about the host/show, follow/subscribe lines, contact details, links) is left out.
const { slugify } = require('../assets/links.js');

const FEED = 'https://anchor.fm/s/10dcc5b9c/podcast/rss';
const TTL = 10 * 60 * 1000;
let cache = { at: 0, items: null };

const decode = s => String(s || '')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
  .replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
// Inline tags vanish without a gap ("Podcast</strong>, Dr" stays "Podcast, Dr"); others become spaces
const text = html => decode(String(html || '')
  .replace(/<\/?(strong|em|b|i|a|span|u)(\s[^>]*)?>/gi, '')
  .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
  .replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
const tag = (s, t) => {
  const m = new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '>').exec(s);
  return m ? m[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '') : '';
};

// Where the episode's own notes end and the show boilerplate begins
const STOP = /^(about the (guest|host|show)|guest\s*[—–-]|host\s*[—–-]|hosted by|enjoyed this episode|follow |subscribe|connect with|new episodes|-{4,})/i;
const LEARN = /(you('|’)ll|you will|we) (learn|explore|take away)|^in this conversation:?$|^what you('|’)ll (learn|take away)/i;
const SKIP = /@|https?:\/\/|www\.|link in the comments|weekly/i;

function parseNotes(html, title) {
  const notes = [], learn = [];
  const blocks = [...String(html).matchAll(/<(p|ul|ol)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)];
  let inLearn = false;
  const titleKey = slugify(title);
  for (const [, kind, inner] of blocks) {
    if (/^ul|ol$/i.test(kind)) {
      const items = [...inner.matchAll(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi)].map(m => text(m[1])).filter(Boolean);
      if (inLearn || !learn.length) learn.push(...items.filter(i => !SKIP.test(i)));
      inLearn = false;
      continue;
    }
    const t = text(inner).replace(/^[\u{1F300}-\u{1FAFF}☀-➿]\s*/u, '');
    if (!t) continue;
    if (STOP.test(t)) break;
    if (/^episode description:?$/i.test(t)) continue;
    if (LEARN.test(t) && t.length < 80) { inLearn = true; continue; }
    if (inLearn && /^[·•\-–*]\s*/.test(t)) { learn.push(t.replace(/^[·•\-–*]\s*/, '')); continue; }
    inLearn = false;
    if (SKIP.test(t)) continue;
    // A first line that just repeats the title
    if (!notes.length && titleKey && slugify(t).startsWith(titleKey) && t.length < 200) continue;
    notes.push(t);
  }
  return { notes, learn };
}

function parseFeed(xml) {
  return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const it = m[1];
    const title = text(tag(it, 'title'));
    const pub = new Date(text(tag(it, 'pubDate')));
    const dur = text(tag(it, 'itunes:duration'));
    const parts = dur.split(':').map(Number);
    const seconds = parts.some(isNaN) ? 0 : parts.reduce((a, v) => a * 60 + v, 0);
    const { notes, learn } = parseNotes(tag(it, 'description'), title);
    return {
      title, key: slugify(title),
      number: parseInt(text(tag(it, 'itunes:episode')), 10) || 0,
      releaseDate: isNaN(pub) ? '' : pub.toISOString().slice(0, 10),
      durationMs: seconds * 1000,
      notes, learn
    };
  });
}

async function feedItems(timeoutMs) {
  if (cache.items && Date.now() - cache.at < TTL) return cache.items;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 2500);
  try {
    const r = await fetch(FEED, { signal: ctrl.signal, headers: { 'User-Agent': 'TheCXAlgorithm/1.0 (+https://www.thecxalgorithm.com)' } });
    if (!r.ok) throw new Error('feed ' + r.status);
    cache = { at: Date.now(), items: parseFeed(await r.text()) };
  } catch (e) {
    if (!cache.items) return [];
  } finally {
    clearTimeout(timer);
  }
  return cache.items;
}

// The feed item for a site episode: same title (first five words of the address), else same episode number
function matchItem(items, title, number) {
  const words = slugify(title).split('-').slice(0, 5).join('-');
  if (words) {
    const byTitle = items.find(it => it.key.split('-').slice(0, 5).join('-') === words);
    if (byTitle) return byTitle;
  }
  return number ? items.find(it => it.number === number) || null : null;
}

module.exports = { FEED, feedItems, matchItem, parseFeed, parseNotes };
