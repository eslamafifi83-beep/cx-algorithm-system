// IndexNow: tells Bing, Yandex, Seznam, Naver and other IndexNow search engines that the site
// changed, so they recrawl it within minutes instead of days. The key is public by design:
// search engines check it against /<key>.txt on this site.
const { SITE, sitePaths, absolute } = require('./site-urls');

const KEY = 'bc7689fba663c739e1ec8ec4a0aedec3';

// Returns the HTTP status (200/202 = accepted), or 0 if IndexNow couldn't be reached in time
async function ping(content, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 2500);
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE).host,
        key: KEY,
        keyLocation: SITE + '/' + KEY + '.txt',
        urlList: sitePaths(content).map(absolute)
      }),
      signal: ctrl.signal
    });
    return r.status;
  } catch (e) {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { KEY, ping };
