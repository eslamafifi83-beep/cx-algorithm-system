/* Shared site navigation.
 * Renders the menu labels & order from your content (editable in /admin → Navigation),
 * with built-in defaults as the no-JS / offline fallback. The page links themselves
 * (which file each item points to) are fixed here so they can never be broken from the admin.
 */
(function () {
  var HREF = {
    home: 'index.html', about: 'about.html', episodes: 'episodes.html',
    guests: 'guests.html', blog: 'blog.html', contact: 'contact.html'
  };
  var DEFAULT = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'The Host' },
    { id: 'episodes', label: 'Episodes' },
    { id: 'guests', label: 'Guests' },
    { id: 'blog', label: 'Articles' },
    { id: 'contact', label: 'Contact' }
  ];

  function reconcile(saved) {
    var def = {}; DEFAULT.forEach(function (d) { def[d.id] = d.label; });
    var out = [], seen = {};
    (saved || []).forEach(function (n) {
      if (n && HREF[n.id] && !seen[n.id]) { out.push({ id: n.id, label: n.label || def[n.id] }); seen[n.id] = 1; }
    });
    DEFAULT.forEach(function (d) { if (!seen[d.id]) out.push({ id: d.id, label: d.label }); });
    return out;
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }

  function render(nav) {
    var el = document.getElementById('siteNav');
    if (!el) return;
    var current = el.getAttribute('data-page') || '';
    el.innerHTML = nav.map(function (n) {
      return '<a href="' + HREF[n.id] + '"' + (n.id === current ? ' aria-current="page"' : '') + '>' + esc(n.label) + '</a>';
    }).join('');
  }

  // Close the mobile menu when a link is tapped (delegated, survives re-render).
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('#siteNav a') : null;
    if (!a) return;
    var nav = document.getElementById('siteNav'), t = document.getElementById('navToggle');
    if (nav) nav.classList.remove('open');
    if (t) t.setAttribute('aria-expanded', 'false');
  });

  // The hardcoded markup already shows the correct defaults, so we only refine
  // from saved content (avoids a flash for anyone who hasn't customised the menu).
  fetch('/api/content', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (c) { if (c && Array.isArray(c.nav) && c.nav.length) render(reconcile(c.nav)); })
    .catch(function () {});
})();
