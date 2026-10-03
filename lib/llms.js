// /llms.txt: a plain-text guide to the site for AI assistants (ChatGPT, Perplexity, Claude…),
// following the llms.txt convention: what the podcast is, every episode with its address and
// a summary, the guests, the key pages and where to listen. Built from the saved content.
const { describe, epNum } = require('./episode-page');
const { matchItem, FEED } = require('./podcast-feed');
const platforms = require('../assets/platforms.js');
const { SITE } = require('./site-urls');

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
      out.push(`- ${clean(g.name)}${role ? ': ' + role : ''}${n ? ' (Episode ' + n + ')' : ''}`);
    });
  }

  out.push('', '## Pages', '',
    `- [Episodes](${SITE}/episodes): every episode, to listen to or watch`,
    `- [Guests](${SITE}/guests): everyone who has joined the show`,
    `- [The Host](${SITE}/about): Dr Eslam Afifi's background, speaking and press`,
    `- [Articles](${SITE}/blog): long-form articles on CX, AI and loyalty by Dr Eslam Afifi (published on LinkedIn)`,
    `- [Contact](${SITE}/contact): speaking enquiries, guest pitches, partnerships and press`);

  out.push('', '## Listen', '');
  platforms.resolve(content).forEach(p => out.push(`- [${p.name}](${p.url})`));
  out.push(`- [RSS feed](${FEED})`, '');
  return out.join('\n');
}

module.exports = { llmsText };
