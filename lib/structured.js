// Structured data (schema.org JSON-LD) for the Guests, Episodes and Articles pages, built from the
// live content. Invisible to visitors; it tells search engines and AI assistants exactly who the
// guests are, which episodes exist and which articles Dr Eslam Afifi wrote.
const { SITE } = require('./site-urls');
const { episodeSlugs } = require('../assets/links.js');

const PERSON = SITE + '/about#person';
const PODCAST = SITE + '/#podcast';
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const cut = (s, n) => { s = clean(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const isUrl = u => /^https?:\/\//.test(String(u || ''));

function companyOf(g) {
  if (g.company) return clean(g.company);
  const m = /,\s*([^,]+)$/.exec(String(g.role || '')); // older cards: "Title, Company"
  return m ? clean(m[1]) : '';
}
function titleOf(g) { return clean(g.company ? g.role : String(g.role || '').replace(/,\s*[^,]+$/, '')); }

function episodeUrls(content) {
  const eps = Array.isArray(content.episodes) ? content.episodes : [];
  const slugs = episodeSlugs(eps);
  return eps.map((e, i) => ({ e, i, url: SITE + '/episodes/' + slugs[i], n: parseInt((/\d+/.exec(e.eyebrow || '') || [i + 1])[0], 10) }));
}

function guests(content) {
  const items = (content.guests && Array.isArray(content.guests.items)) ? content.guests.items : [];
  const eps = episodeUrls(content);
  const people = items.filter(g => g && g.name).map((g, i) => {
    const ep = eps.find(x => clean(x.e.guest).toLowerCase() === clean(g.name).toLowerCase());
    const p = { '@type': 'Person', name: clean(g.name) };
    if (titleOf(g)) p.jobTitle = titleOf(g);
    if (companyOf(g)) p.worksFor = { '@type': 'Organization', name: companyOf(g) };
    if (g.bio) p.description = cut(g.bio, 300);
    if (isUrl(g.linkedInUrl)) p.sameAs = [g.linkedInUrl];
    if (ep) p.subjectOf = { '@type': 'PodcastEpisode', name: clean(ep.e.title), url: ep.url, episodeNumber: ep.n, partOfSeries: { '@id': PODCAST } };
    return { '@type': 'ListItem', position: i + 1, item: p };
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': SITE + '/guests#page',
    url: SITE + '/guests',
    name: 'Guests of The CX Algorithm Podcast',
    description: 'The leaders in customer experience, data and AI who have joined Dr Eslam Afifi on The CX Algorithm podcast.',
    isPartOf: { '@id': SITE + '/#website' },
    about: { '@id': PODCAST },
    mainEntity: { '@type': 'ItemList', numberOfItems: people.length, itemListElement: people }
  };
}

function episodes(content) {
  const list = episodeUrls(content).reverse().map(({ e, url, n }, k) => {
    const ep = { '@type': 'PodcastEpisode', name: clean(e.title), url, episodeNumber: n, partOfSeries: { '@id': PODCAST } };
    if (e.description) ep.description = cut(e.description, 300);
    if (e.guest) ep.actor = { '@type': 'Person', name: clean(e.guest) };
    ep.author = { '@id': PERSON };
    return { '@type': 'ListItem', position: k + 1, item: ep };
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': SITE + '/episodes#page',
    url: SITE + '/episodes',
    name: 'All episodes of The CX Algorithm Podcast',
    isPartOf: { '@id': SITE + '/#website' },
    about: { '@id': PODCAST },
    mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list }
  };
}

function blog(content) {
  const arts = (content.blog && Array.isArray(content.blog.articles)) ? content.blog.articles : [];
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': SITE + '/blog#blog',
    url: SITE + '/blog',
    name: 'Notes on CX, AI & the algorithm of loyalty',
    description: 'Articles by Dr Eslam Afifi on customer experience, data and AI, published on LinkedIn.',
    author: { '@id': PERSON },
    blogPost: arts.filter(a => a && a.title).map(a => {
      const p = { '@type': 'BlogPosting', headline: clean(a.title), author: { '@id': PERSON } };
      if (a.excerpt) p.description = cut(a.excerpt, 300);
      if (isUrl(a.linkedInUrl)) { p.url = a.linkedInUrl.split('?')[0]; p.mainEntityOfPage = p.url; }
      if (a.tag) p.articleSection = clean(a.tag);
      return p;
    })
  };
}

const BUILDERS = { guests, episodes, blog };

// <script type="application/ld+json"> for a page ('' when the page has none of its own)
function jsonLdTag(name, content) {
  const b = BUILDERS[name];
  if (!b) return '';
  return '<script type="application/ld+json">' + JSON.stringify(b(content)).replace(/</g, '\\u003c') + '</script>';
}

module.exports = { jsonLdTag };
