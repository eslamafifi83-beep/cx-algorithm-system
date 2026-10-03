// Every public address on the site, for the sitemap and IndexNow pings.
const { PAGE, episodeSlugs } = require('../assets/links.js');

const SITE = 'https://www.thecxalgorithm.com';

// The fixed pages, most important first
const PAGES = [PAGE.home, PAGE.episodes, PAGE.guests, PAGE.about, PAGE.blog, PAGE.contact];

function sitePaths(content) {
  const episodes = content && Array.isArray(content.episodes) ? content.episodes : [];
  // Newest episodes (end of the list) first
  const eps = [...new Set(episodeSlugs(episodes))].reverse().map(slug => '/episodes/' + slug);
  return PAGES.concat(eps);
}

const absolute = p => SITE + (p === '/' ? '/' : p);

module.exports = { SITE, PAGES, sitePaths, absolute };
