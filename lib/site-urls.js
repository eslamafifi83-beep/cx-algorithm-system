// Every public address on the site, for the sitemap and IndexNow pings.
const { PAGE, episodeSlugs, articleSlugs } = require('../assets/links.js');

const SITE = 'https://www.thecxalgorithm.com';

// The fixed pages, most important first
const PAGES = [PAGE.home, PAGE.episodes, PAGE.guests, PAGE.about, PAGE.blog, PAGE.contact];

function sitePaths(content) {
  const episodes = content && Array.isArray(content.episodes) ? content.episodes : [];
  // Newest episodes (end of the list) first
  const eps = [...new Set(episodeSlugs(episodes))].reverse().map(slug => '/episodes/' + slug);
  // Articles, newest first
  const articles = (content && content.blog && Array.isArray(content.blog.articles) ? content.blog.articles : []).filter(a => a && String(a.title || '').trim());
  const arts = articleSlugs(articles).reverse().map(slug => '/blog/' + slug);
  return PAGES.concat(eps, arts);
}

const absolute = p => SITE + (p === '/' ? '/' : p);

module.exports = { SITE, PAGES, sitePaths, absolute };
