// Turns a public LinkedIn article page into clean HTML for the site's own article pages
// (/blog/<address>). Only text, headings, quotes, lists, links, images, videos and dividers are kept,
// rebuilt from scratch, so nothing of LinkedIn's page (scripts, styles, tracking) comes along.
// Used by scripts/articles/import.js (saves a copy in articles/) and, for an article with no saved
// copy yet, by the article page itself.
let linkedom = null;
const loadDom = async () => (linkedom = linkedom || await import('linkedom'));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// The article's address on LinkedIn without tracking, e.g. https://www.linkedin.com/pulse/<key>/
function pulseKey(url) {
  const m = /linkedin\.com\/pulse\/([A-Za-z0-9-]+)/i.exec(String(url || ''));
  return m ? m[1].toLowerCase() : '';
}

function safeHref(href) {
  let h = String(href || '').trim();
  const red = /linkedin\.com\/redir\/redirect\?url=([^&]+)/i.exec(h);
  if (red) { try { h = decodeURIComponent(red[1]); } catch (e) { /* keep as is */ } }
  if (!/^https?:\/\//i.test(h)) return '';
  // LinkedIn adds its own tracking tag to outgoing links
  return h.replace(/([?&])trk=[^&#]*&?/, '$1').replace(/[?&](#|$)/, '$1');
}

// Inline content: text, bold, italic, links and line breaks
function inline(node) {
  let out = '';
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { out += esc(n.textContent.replace(/\s+/g, ' ')); continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.tagName.toLowerCase();
    const cls = n.getAttribute('class') || '';
    const inner = inline(n);
    if (tag === 'br') out += '<br>';
    else if (tag === 'a') {
      const href = safeHref(n.getAttribute('href'));
      out += href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : inner;
    } else if (tag === 'strong' || tag === 'b' || /\bfont-bold\b/.test(cls)) out += inner.trim() ? `<strong>${inner}</strong>` : inner;
    else if (tag === 'em' || tag === 'i' || /\bitalic\b/.test(cls)) out += inner.trim() ? `<em>${inner}</em>` : inner;
    else out += inner;
  }
  return out.replace(/<\/strong><strong>|<\/em><em>/g, '');
}

function textBlock(el) {
  const out = [];
  for (const c of el.children) {
    const tag = c.tagName.toLowerCase();
    if (/^(p|h2|h3|blockquote)$/.test(tag)) {
      const h = inline(c).trim();
      if (h && h !== '<br>') out.push(`<${tag}>${h}</${tag}>`);
    } else if (tag === 'ul' || tag === 'ol') {
      const items = [...c.querySelectorAll(':scope > li')].map(li => inline(li).trim()).filter(Boolean);
      if (items.length) out.push(`<${tag}>${items.map(i => `<li>${i}</li>`).join('')}</${tag}>`);
    } else if (/^h[1-6]$/.test(tag)) {
      const h = inline(c).trim();
      if (h) out.push(`<h3>${h}</h3>`);
    }
  }
  return out;
}

async function extractArticle(html) {
  const { parseHTML } = await loadDom();
  const { document } = parseHTML(html);
  const first = document.querySelector('.article-main__content');
  if (!first) throw new Error('no article content');
  const root = first.parentElement;
  const parts = [];
  for (const el of root.children) {
    const kind = el.getAttribute('data-test-id') || '';
    if (kind === 'publishing-text-block') parts.push(...textBlock(el));
    else if (kind === 'publishing-image-block') {
      const img = el.querySelector('img');
      const src = img && safeHref(img.getAttribute('data-delayed-url') || img.getAttribute('src'));
      const cap = el.querySelector('figcaption');
      const capText = cap ? inline(cap).trim() : '';
      if (src) parts.push(`<figure><img src="${esc(src)}" alt="" loading="lazy" decoding="async">${capText ? `<figcaption>${capText}</figcaption>` : ''}</figure>`);
    } else if (kind === 'publishing-video-block') {
      const v = el.querySelector('video');
      let sources = [];
      try { sources = JSON.parse(v.getAttribute('data-sources') || '[]'); } catch (e) { sources = []; }
      const mp4 = sources.filter(s => s && /mp4/.test(s.type || '') && safeHref(s.src)).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      const poster = safeHref(v.getAttribute('data-poster-url'));
      if (mp4) parts.push(`<figure class="art-video"><video controls playsinline preload="none"${poster ? ` poster="${esc(poster)}"` : ''} src="${esc(mp4.src)}"></video></figure>`);
    } else if (kind === 'publishing-divider-block' || el.tagName === 'HR') parts.push('<hr>');
  }
  // No divider at the very start or end, and never two in a row
  const body = parts.filter((p, i) => !(p === '<hr>' && (i === 0 || i === parts.length - 1 || parts[i - 1] === '<hr>')));
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch (e) { return null; } }).find(j => j && j.datePublished);
  const h1 = document.querySelector('h1');
  return {
    title: h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : '',
    published: (ld && ld.datePublished) || '',
    html: body.join('\n')
  };
}

async function fetchArticle(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
  try {
    const res = await fetch(String(url).split('?')[0], { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok || !/linkedin\.com\/pulse\//.test(res.url)) throw new Error('LinkedIn answered ' + res.status + ' ' + res.url);
    return await extractArticle(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { pulseKey, extractArticle, fetchArticle };
