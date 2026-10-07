// /blog/<address>: each article from admin → Blog as a page on the site, in the blog's design.
// The text comes from the saved copy in articles/<key>.json (scripts/articles/import.js); an article
// with no saved copy is read from LinkedIn on the spot. Title, tag, date, read time and cover come
// from admin → Blog, so edits there show up here too.
const fs = require('fs');
const path = require('path');
const { articleSlugs } = require('../assets/links.js');
const { pulseKey } = require('./linkedin-article');
const { SITE } = require('./site-urls');

const HOST = 'Dr Eslam Afifi';
const SHOW = 'The CX Algorithm Podcast';
const DEFAULT_IMAGE = SITE + '/assets/og-image.png';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const isVideo = src => /\.(mp4|webm|mov)(\?|$)/i.test(src || '');
const noQuery = u => String(u || '').split('?')[0];
const OPTIMISABLE = /^(\/assets\/|https:\/\/fuuuhcvwlrfenjfpcymy\.supabase\.co\/storage\/v1\/object\/public\/)[^?#]+\.(png|jpe?g|webp)$/i;
const optimised = (src, w) => OPTIMISABLE.test(src) ? '/_vercel/image?url=' + encodeURIComponent(src) + '&w=' + w + '&q=75' : src;
const absUrl = u => !u ? '' : /^https?:\/\//i.test(u) ? u : SITE + '/' + String(u).replace(/^\.?\/+/, '');

function shorten(text, max) {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '') + '…';
}

let template = null;
const readTemplate = () => template || (template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'article.html'), 'utf8'));

function listOf(content) {
  return (content && content.blog && Array.isArray(content.blog.articles) ? content.blog.articles : []).filter(a => a && clean(a.title));
}

// Which article an address points to: { idx } / { location } (a moved or shortened address) / {}
function route(content, slug) {
  const arts = listOf(content);
  const slugs = articleSlugs(arts);
  const raw = String(slug || '').trim();
  if (slugs.includes(raw)) return { idx: slugs.indexOf(raw) };
  const s = raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (slugs.includes(s)) return { location: '/blog/' + s, permanent: true };
  // An address shared before its title was edited: the article whose address starts the same way
  const words = s.split('-');
  if (words.length >= 4) {
    const lead = x => { const w = x.split('-'); let k = 0; while (k < w.length && w[k] === words[k]) k++; return k; };
    let best = -1, bestLead = 3;
    slugs.forEach((x, i) => { const k = lead(x); if (k > bestLead) { best = i; bestLead = k; } });
    if (best >= 0) return { location: '/blog/' + slugs[best], permanent: true };
  }
  return {};
}

function savedCopy(article) {
  const key = pulseKey(article && article.linkedInUrl);
  if (!key) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'articles', key + '.json'), 'utf8'));
  } catch (e) {
    return null;
  }
}

function heroHTML(a, copy) {
  const src = String(a.thumbnail || '');
  if (!src) return '';
  if (isVideo(src)) return `<div class="art-hero"><video data-src="${esc(src)}" muted loop playsinline preload="none" aria-hidden="true"></video></div>`;
  const file = /^assets\//.test(src) ? '/' + src : src;
  // Size saved by the import, so the page keeps the cover's space while it loads
  const size = copy && copy.hero && copy.hero.src === src && copy.hero.w ? ` width="${copy.hero.w}" height="${copy.hero.h}"` : '';
  const srcset = OPTIMISABLE.test(file) ? ` srcset="${[640, 1080, 1600].map(w => esc(optimised(file, w)) + ' ' + w + 'w').join(', ')}" sizes="(max-width: 820px) 100vw, 760px"` : '';
  return `<div class="art-hero is-image"><img src="${esc(optimised(file, 1600))}"${srcset} data-src="${esc(file)}" alt=""${size} fetchpriority="high" decoding="async" /></div>`;
}

function cardHTML(a, url) {
  const src = String(a.thumbnail || '');
  const file = /^assets\//.test(src) ? '/' + src : src;
  const thumb = !src
    ? '<div class="ph" aria-hidden="true"></div>'
    : isVideo(src)
      ? `<video src="${esc(src)}#t=0.5" muted playsinline preload="metadata" aria-hidden="true"></video>`
      : `<img src="${esc(optimised(file, 640))}" data-src="${esc(file)}" alt="" loading="lazy" decoding="async" />`;
  return `
      <a class="post" href="${esc(url)}">
        <div class="post-thumb">
          ${thumb}
          <span class="in-badge" aria-hidden="true">in</span>
        </div>
        <div class="post-body">
          <div class="meta-line">
            ${a.tag ? `<span class="tag-pill">${esc(a.tag)}</span>` : ''}
            ${a.readTime ? `<span class="meta-dim">${esc(a.readTime)}</span>` : ''}
          </div>
          <h3>${esc(a.title)}</h3>
          <p class="excerpt">${esc(shorten(a.excerpt, 170))}</p>
          <div class="post-foot">
            <span class="date">${esc(a.date || '')}</span>
            <span class="read-link">Read article&nbsp;&rarr;</span>
          </div>
        </div>
      </a>`;
}

function headTags(v) {
  return `<title>${esc(v.title)} — Dr Eslam Afifi</title>
<meta name="description" content="${esc(v.description)}" />
<link rel="canonical" href="${esc(v.url)}" />
<meta name="author" content="${HOST}" />
<meta name="theme-color" content="#0C1128" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${SHOW}" />
<meta property="og:title" content="${esc(v.title)}" />
<meta property="og:description" content="${esc(v.description)}" />
<meta property="og:url" content="${esc(v.url)}" />
<meta property="og:image" content="${esc(v.image)}" />
${v.published ? `<meta property="article:published_time" content="${esc(v.published)}" />\n` : ''}<meta property="article:author" content="${HOST}" />
${v.tag ? `<meta property="article:section" content="${esc(v.tag)}" />\n` : ''}<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(v.title)}" />
<meta name="twitter:description" content="${esc(v.description)}" />
<meta name="twitter:image" content="${esc(v.image)}" />`;
}

function structuredData(v) {
  const words = clean(v.body.replace(/<[^>]+>/g, ' ')).split(' ').length;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BlogPosting',
      '@id': v.url + '#article',
      headline: v.title,
      description: v.description,
      url: v.url,
      mainEntityOfPage: v.url,
      image: v.image,
      datePublished: v.published || undefined,
      author: { '@type': 'Person', '@id': SITE + '/about#person', name: HOST, url: SITE + '/about' },
      publisher: { '@type': 'Organization', name: SHOW, url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/assets/logo.png' } },
      isPartOf: { '@type': 'Blog', '@id': SITE + '/blog#blog', url: SITE + '/blog', name: 'Articles by Dr Eslam Afifi' },
      articleSection: v.tag || undefined,
      wordCount: words,
      inLanguage: 'en',
      sameAs: v.source || undefined
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Articles', item: SITE + '/blog' },
        { '@type': 'ListItem', position: 3, name: v.title, item: v.url }
      ]
    }]
  };
  return `<script type="application/ld+json">${json(ld)}</script>`;
}

// copy: { html, published, source } from articles/ or straight from LinkedIn
function render(content, idx, copy) {
  const arts = listOf(content);
  const slugs = articleSlugs(arts);
  const a = arts[idx];
  const url = SITE + '/blog/' + slugs[idx];
  const source = noQuery(a.linkedInUrl) || (copy && copy.source) || '';
  const thumb = String(a.thumbnail || '');
  const v = {
    title: clean(a.title),
    description: shorten(a.excerpt || (copy && copy.html || '').replace(/<[^>]+>/g, ' '), 180),
    url,
    image: thumb && !isVideo(thumb) ? absUrl(thumb) : DEFAULT_IMAGE,
    published: (copy && copy.published) || '',
    tag: clean(a.tag),
    source,
    // Sub-headings follow the page title in order (h1, then h2): LinkedIn's h3s become h2s styled as before
    body: ((copy && copy.html) || '').replace(/<h3>([\s\S]*?)<\/h3>/g, '<h2 class="sub">$1</h2>')
  };
  const blog = content.blog || {};
  const newsletter = blog.newsletterUrl || (content.links && content.links.linkedin) || '';
  const hostPhoto = (content.host && content.host.photo) || 'assets/dr-eslam-afifi.png';
  const photoFile = /^assets\//.test(hostPhoto) ? '/' + hostPhoto : hostPhoto;
  const meta = [a.date, a.readTime].map(clean).filter(Boolean).map(esc).join(' · ');
  // Up to three more articles, newest first
  const more = arts.map((x, i) => ({ x, i })).filter(o => o.i !== idx).reverse().slice(0, 3);

  const main = `<main class="container art-main" id="page">
  <article class="art">
    <a class="art-back" href="/blog"><span aria-hidden="true">&larr;</span> All articles</a>
    <header class="art-head">
      <div class="meta-line">
        ${v.tag ? `<span class="tag-pill">${esc(v.tag)}</span>` : ''}
        ${meta ? `<span class="meta-dim">${meta}</span>` : ''}
      </div>
      <h1>${esc(v.title)}</h1>
      <div class="art-by">
        <a class="who" href="/about" style="color:inherit;text-decoration:none">
          <img src="${esc(optimised(photoFile, 128))}" data-src="${esc(photoFile)}" alt="" width="44" height="44" />
          <span><span class="n" style="display:block">${HOST}</span><span class="r" style="display:block">Host of ${SHOW}</span></span>
        </a>
        ${source ? `<a class="art-li" href="${esc(source)}" target="_blank" rel="noopener noreferrer"><span class="in-mark" aria-hidden="true">in</span>Also on LinkedIn&nbsp;&nearr;</a>` : ''}
      </div>
    </header>
    ${heroHTML(a, copy)}
    <div class="art-body">
${v.body}
    </div>
    <aside class="art-end">
      <h2>Join the conversation</h2>
      <p>Share your take in the comments on LinkedIn, or hear these ideas unpacked with guests on the podcast.</p>
      <div class="row">
        ${source ? `<a class="btn btn-gold" href="${esc(source)}" target="_blank" rel="noopener noreferrer">Comment on LinkedIn&nbsp;&nearr;</a>` : ''}
        <a class="btn btn-outline" href="/episodes">Listen to the podcast</a>
        ${newsletter ? `<a class="btn btn-outline" href="${esc(newsletter)}" target="_blank" rel="noopener noreferrer">Get the newsletter&nbsp;&nearr;</a>` : ''}
      </div>
    </aside>
  </article>
  ${more.length ? `<section class="art-more" aria-label="More articles">
    <div class="grid-head"><h2>More articles</h2><a class="read-link" href="/blog" style="text-decoration:none">All articles&nbsp;&rarr;</a></div>
    <div class="cards">${more.map(o => cardHTML(o.x, '/blog/' + slugs[o.i])).join('')}
    </div>
  </section>` : ''}
</main>`;

  let html = readTemplate();
  const swap = (re, str) => { const before = html; html = html.replace(re, () => str); if (html === before) console.warn('[article-page] template marker missing:', re); };
  swap(/<title>[\s\S]*?<meta name="twitter:image"[^>]*>/, headTags(v));
  swap(/<\/head>/, structuredData(v) + '\n</head>');
  swap(/<main class="container art-main" id="page"><\/main>/, main);
  return html;
}

module.exports = { route, render, savedCopy, listOf };
