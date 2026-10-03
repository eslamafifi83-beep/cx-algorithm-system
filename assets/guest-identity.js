/*
 * Guest identity: works out which company a guest is from, which uploaded logo to show,
 * and the brand colour of their card. Shared by guests.html and the admin so both agree.
 *
 *   CXGuest.identity(guest, companies) -> { title, company, logo, accent }
 *
 * The admin can set guest.company / guest.companyRef / company colours explicitly;
 * anything left blank is worked out from the guest's role text, e.g.
 * "Head of Research, COX Architecture" -> title "Head of Research", company "COX Architecture".
 */
(function () {
  // Known brand colours, tuned to read well on the navy site
  const BRAND = [
    [/\bie university\b|\bie\b business/i, '#4FB3FF'],
    [/samsung/i, '#6A85FF'],
    [/openbank|santander/i, '#FF5A64'],
    [/energy exemplar/i, '#FF8A3D'],
    [/world journeys/i, '#8FBFD0'],
    [/game ?changers/i, '#7CC4E4'],
    [/master ?card|^master\b/i, '#FFA62B'],
    [/\bcox\b/i, '#E6D3B8']
  ];
  const PALETTE = ['#4FB3FF', '#FF8A3D', '#7CC4E4', '#FFA62B', '#B79CFF', '#5FD3A8', '#FF6F91', '#E6D3B8'];

  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const norm = s => String(s || '').trim().toLowerCase();

  function accentFor(text) {
    const t = String(text || '');
    for (const [re, colour] of BRAND) if (re.test(t)) return colour;
    let h = 0;
    for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  // Find a company from the Companies list mentioned in some text. Tries the full name,
  // then its first word (so "Gamechangers España" still matches "GameChangers People & Talent").
  function matchCompany(text, companies) {
    const t = String(text || '');
    const list = (companies || []).filter(c => c && norm(c.name).length >= 2);
    for (const c of list) {
      const m = new RegExp('\\b' + escapeRe(c.name.trim()), 'i').exec(t);
      if (m) return { company: c, at: m.index };
    }
    for (const c of list) {
      const first = c.name.trim().split(/\s+/)[0];
      if (first.length < 4) continue;
      const m = new RegExp('\\b' + escapeRe(first), 'i').exec(t);
      if (m) return { company: c, at: m.index };
    }
    return null;
  }

  // "Co-founder & director of World Journeys" -> { title: "Co-founder & director", company: "World Journeys" }
  function splitRole(role, companies) {
    const r = String(role || '').trim();
    const m = matchCompany(r, companies);
    if (!m) return { title: r, company: '', match: null };
    const title = r.slice(0, m.at).replace(/[\s,;:|·–—-]+$/, '').replace(/\s+(at|of|for|with|from)$/i, '').trim();
    const company = r.slice(m.at).replace(/[\s.,;:]+$/, '').trim();
    return title ? { title, company, match: m.company } : { title: r, company, match: m.company };
  }

  function identity(g, companies) {
    const byName = name => (companies || []).find(c => norm(c.name) === norm(name)) || null;
    let title = String(g.role || '').trim();
    let company = String(g.company || '').trim();
    let co = g.companyRef ? byName(g.companyRef) : null;
    if (!company) {
      const s = splitRole(title, companies);
      if (s.company) { title = s.title; company = s.company; co = co || s.match; }
    } else if (!co) {
      const m = matchCompany(company, companies) || matchCompany(title, companies);
      co = m ? m.company : null;
    }
    return {
      title,
      company,
      logo: co && co.logo ? co.logo : '',
      accent: (co && co.color) || accentFor(company || (co && co.name) || g.name)
    };
  }

  window.CXGuest = { identity, splitRole, matchCompany, accentFor };
})();
