// /llms.txt: a plain-text guide to the site for AI assistants (ChatGPT, Perplexity, Claude…),
// following the llms.txt convention: what the podcast is, every episode with its address and
// a summary, the guests, the key pages and where to listen. Built from the saved content.
const { describe, epNum } = require('./episode-page');
const { matchItem, FEED } = require('./podcast-feed');
const platforms = require('../assets/platforms.js');
const { SITE } = require('./site-urls');
const { articleSlugs } = require('../assets/links.js');

const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

function llmsText(content, feed) {
  const eps = content && Array.isArray(content.episodes) ? content.episodes : [];
  const out = [
    '# The CX Algorithm Podcast',
    '',
    '> The CX Algorithm is a video and audio podcast hosted by Dr Eslam Afifi, talking with the leaders reshaping customer experience, data and AI. Every episode has its own page on this site with episode notes, guest details and a player.',
    '',
    `- Host: Dr Eslam Afifi, enterprise insights leader in customer experience, Voice of Customer and AI, and international speaker (${SITE}/about)`,
    `- Contact: hello@thecxalgorithm.com, or the form at ${SITE}/contact (speaking, guest pitches, partnerships, press)`,
    `- Episodes so far: ${eps.filter(e => e && e.title).length}`,
    '',
    '## Episodes (newest first)',
    ''
  ];
  const episodeOf = {}; // guest name -> episode number
  for (let i = eps.length - 1; i >= 0; i--) {
    const ep = eps[i];
    if (!ep || !clean(ep.title)) continue;
    const n = Number(epNum(ep, i));
    const item = matchItem(feed || [], ep.title, n);
    const v = describe(content, i, item ? { durationMs: item.durationMs, releaseDate: item.releaseDate, notes: item.notes, learn: item.learn } : {});
    const bits = ['Episode ' + n];
    if (v.guest && v.guest.name) episodeOf[v.guest.name.toLowerCase()] = n;
    if (v.guest && v.guest.name) bits.push('with ' + v.guest.name + (v.guest.line ? ' (' + v.guest.line + ')' : ''));
    if (v.released) bits.push('released ' + v.released);
    out.push(`- [${v.title}](${v.url}): ${bits.join(', ')}. ${v.longDescription}`);
  }

  const guests = content && content.guests && Array.isArray(content.guests.items) ? content.guests.items : [];
  const named = guests.filter(g => g && clean(g.name));
  if (named.length) {
    out.push('', '## Guests', '');
    named.forEach(g => {
      const role = [clean(g.role), clean(g.company)].filter(Boolean).join(', ');
      const label = /[0-9]+/.exec(g.episodeLabel || '');
      const n = episodeOf[clean(g.name).toLowerCase()] || (label ? Number(label[0]) : 0);
      const li = /^https?:\/\//.test(g.linkedInUrl || '') ? ', LinkedIn: ' + g.linkedInUrl : '';
      out.push(`- ${clean(g.name)}${role ? ': ' + role : ''}${n ? ' (Episode ' + n + ')' : ''}${li}`);
    });
  }

  // The host: credentials, public track record, stages and speaking topics (Host page + admin → About page)
  const about = (content && content.about) || {};
  const host = (content && content.host) || {};
  const pressKit = /^https?:\/\//.test(host.pressKit || '') ? host.pressKit : '';
  out.push('', '## The host: Dr Eslam Afifi', '');
  const firstSentence = (clean(host.bio1).match(/^.*?\.(?=\s|$)/) || [''])[0];
  if (firstSentence) out.push(firstSentence.replace(/^Hello, I'm Dr Eslam Afifi\s*[-–—]\s*/, 'Dr Eslam Afifi is '), '');
  (Array.isArray(about.credentials) ? about.credentials : []).filter(c => c && clean(c.title))
    .forEach(c => out.push(`- ${clean(c.title)}, ${clean(c.org)}${clean(c.note) ? ' (' + clean(c.note) + ')' : ''}`));
  const results = (Array.isArray(about.results) ? about.results : []).filter(r => r && clean(r.value));
  if (results.length) out.push('- Track record: ' + results.map(r => clean(r.value) + ' ' + clean(r.label)).join(', '));
  if (Array.isArray(about.seenAt) && about.seenAt.length) out.push('- Spoken at: ' + about.seenAt.map(clean).join(', '));
  out.push('- Speaking topics (six lenses on customer experience): Human behaviour; Loyalty & trust; Experience design; Data & growth; AI & automation; Connected teams');
  out.push('- Formats: keynotes, panels, fireside chats and workshops, advisory and podcast guesting, in person or virtual');
  if (pressKit) out.push(`- Press kit (PDF): ${pressKit}`);

  const articles = (content && content.blog && Array.isArray(content.blog.articles) ? content.blog.articles : []).filter(a => a && clean(a.title));
  if (articles.length) {
    out.push('', '## Articles by Dr Eslam Afifi', '');
    const slugs = articleSlugs(articles);
    articles.forEach((a, i) => out.push(`- [${clean(a.title)}](${SITE}/blog/${slugs[i]})${clean(a.excerpt) ? ': ' + clean(a.excerpt) : ''}`));
  }

  const listenOn = platforms.resolve(content).map(p => p.name);
  out.push('', '## Frequently asked questions', '',
    '**What is The CX Algorithm?**',
    'A video and audio podcast about customer experience, data and AI, hosted by Dr Eslam Afifi. Each episode is a long-form conversation (about 20 to 35 minutes) with a leader who has made real decisions in CX, data or AI. Every episode has its own page on this site with notes, chapters, key takeaways and a full transcript.',
    '',
    '**Who hosts The CX Algorithm?**',
    'Dr Eslam Afifi: a customer experience, Voice of Customer and AI leader with over 15 years of experience across Australia, Europe and the GCC, a PhD from Monash University, an Executive MBA from IE Business School and two Australian CX Awards.',
    '',
    '**Where can I listen?**',
    (listenOn.length ? listenOn.join(', ') + ', and any podcast app through the RSS feed.' : 'Any podcast app through the RSS feed.') + ' Video episodes are on Spotify and YouTube.',
    '',
    '**How can I be a guest on the show?**',
    `Send a pitch through ${SITE}/contact#guest or email hello@thecxalgorithm.com. The show looks for leaders with a real story about customer experience, data or AI: the decisions made, the lessons learned and the results.`,
    '',
    '**Does Dr Eslam Afifi speak at events?**',
    `Yes: keynotes, panels, fireside chats and workshops for CX and insights leaders, in person or live on screen. Book through ${SITE}/contact#speak.`,
    '',
    '**Is there a press kit?**',
    pressKit ? `Yes, a 4-page PDF about the podcast, its guests and the host: ${pressKit}` : `Request one through ${SITE}/contact#press.`,
    '',
    '**How do I get in touch?**',
    `Email hello@thecxalgorithm.com or use the form at ${SITE}/contact for speaking, guest pitches, partnerships and press.`);

  out.push('', '## Pages', '',
    `- [Episodes](${SITE}/episodes): every episode, to listen to or watch`,
    `- [Guests](${SITE}/guests): everyone who has joined the show`,
    `- [The Host](${SITE}/about): Dr Eslam Afifi's background, speaking and press`,
    `- [Articles](${SITE}/blog): long-form articles on CX, AI and loyalty by Dr Eslam Afifi, each on its own page`,
    `- [Contact](${SITE}/contact): speaking enquiries, guest pitches, partnerships and press`);

  out.push('', '## Listen', '');
  platforms.resolve(content).forEach(p => out.push(`- [${p.name}](${p.url})`));
  out.push(`- [RSS feed](${FEED})`, '');
  return out.join('\n');
}

module.exports = { llmsText };
