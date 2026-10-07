/*
 * Site addresses, shared by the pages (window.CXLinks) and the server (require('../assets/links.js')),
 * so an episode's address is worked out the same way everywhere.
 *
 *   CXLinks.PAGE.guests                     -> '/guests'
 *   CXLinks.episodeSlugs(content.episodes)  -> ['beyond-the-hype-ai-attention-…', …] (same order, unique)
 *   CXLinks.episodeUrl(content.episodes, 7) -> '/episodes/before-you-think-the-room-has-already-spoken'
 *   CXLinks.articleUrl(content.blog.articles, 0) -> '/blog/customer-centricity-is-not-a-mindset-its-an-algorithm'
 *
 * An episode's (or article's) address comes from its title, so renaming one changes its address.
 */
(function (root) {
  const PAGE = { home: '/', guests: '/guests', about: '/about', episodes: '/episodes', blog: '/blog', contact: '/contact' };

  function slugify(text) {
    let s = String(text || '')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/['’‘`]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (s.length > 72) {
      s = s.slice(0, 72);
      const cut = s.lastIndexOf('-');
      if (cut > 40) s = s.slice(0, cut);
      // don't end a shortened address on a filler word ("…of-space-in")
      const parts = s.split('-');
      while (parts.length > 3 && /^(a|an|and|at|by|for|in|of|on|or|the|to|with|your)$/.test(parts[parts.length - 1])) parts.pop();
      s = parts.join('-');
    }
    return s.replace(/-+$/, '');
  }

  function episodeSlugs(episodes) {
    const used = {};
    return (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
      const base = slugify(ep && ep.title) || 'episode-' + (i + 1);
      let slug = base, n = 2;
      while (used[slug]) slug = base + '-' + n++;
      used[slug] = true;
      return slug;
    });
  }

  // Articles work the same way, under /blog/
  function articleSlugs(articles) {
    const used = {};
    return (Array.isArray(articles) ? articles : []).map((a, i) => {
      const base = slugify(a && a.title) || 'article-' + (i + 1);
      let slug = base, n = 2;
      while (used[slug]) slug = base + '-' + n++;
      used[slug] = true;
      return slug;
    });
  }

  function articleUrl(articles, idx) {
    const slug = articleSlugs(articles)[idx];
    return slug ? '/blog/' + slug : PAGE.blog;
  }

  function episodeUrl(episodes, idx, mode) {
    const slug = episodeSlugs(episodes)[idx];
    if (!slug) return PAGE.episodes;
    return '/episodes/' + slug + (mode === 'watch' ? '?mode=watch' : '');
  }

  const api = { PAGE, slugify, episodeSlugs, episodeUrl, articleSlugs, articleUrl };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CXLinks = api;
})(typeof self !== 'undefined' ? self : this);
