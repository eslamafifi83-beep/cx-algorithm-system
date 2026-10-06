// Server-side prerender for the pages that fill themselves in from /api/content (Guests, Episodes,
// Articles). It runs the page's OWN scripts against a lightweight DOM (linkedom) with the live content,
// so the HTML a crawler or AI agent receives already contains every guest, episode and article, built
// by exactly the same code the browser runs. The browser still runs those scripts as before and
// re-renders the same markup, so nothing changes visually.
// Anything unexpected → the caller serves the untouched template (today's behaviour).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
// linkedom's dependencies are ES modules: load it with import(), which every Node version supports
// (a plain require() only works on the newest Node and crashed the function on Vercel)
let linkedom = null;
const loadDom = async () => (linkedom = linkedom || await import('linkedom'));

const ROOT = path.join(__dirname, '..');
// Shared helpers the pages load from /assets; loader.js (intro animation), nav.js (menu) and
// analytics are browser-only and are skipped.
const RUN_ASSETS = new Set(['/assets/img.js', '/assets/links.js', '/assets/platforms.js', '/assets/guest-identity.js', '/assets/episodes-core.js']);

function noop() {}
class Stub { constructor() {} observe() {} unobserve() {} disconnect() {} }

async function prerender(html, { url, content, fetchJson }) {
  const { parseHTML } = await loadDom();
  const { window, document } = parseHTML(html);
  const loc = new URL(url);
  const store = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
  const g = {
    document, console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    location: { href: loc.href, origin: loc.origin, protocol: loc.protocol, host: loc.host, hostname: loc.hostname, pathname: loc.pathname, search: loc.search, hash: '' },
    navigator: { userAgent: 'prerender', language: 'en' },
    history: { replaceState: noop, pushState: noop },
    localStorage: store(), sessionStorage: store(),
    setTimeout: (fn, ms) => (ms > 50 ? 0 : setTimeout(fn, 0)), clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop, requestIdleCallback: () => 0,
    IntersectionObserver: Stub, ResizeObserver: Stub, MutationObserver: Stub,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    scrollTo: noop, scrollBy: noop, innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
    Image: function Image() { return document.createElement('img'); },
    URL, URLSearchParams, Promise, JSON, Math, Date, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, parseInt, parseFloat, isNaN, Number, String, Array, Object, RegExp, Map, Set, Symbol, Error,
    fetch: async (u) => {
      const p = new URL(String(u), loc.origin);
      let body = null;
      if (p.pathname === '/api/content') body = content;
      else if (fetchJson) body = await fetchJson(p);
      if (body == null) return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
      return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(body)), text: async () => JSON.stringify(body) };
    }
  };
  ['Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'DocumentFragment', 'HTMLImageElement', 'HTMLVideoElement'].forEach(k => { if (window[k]) g[k] = window[k]; });
  g.window = g; g.self = g; g.globalThis = g;
  g.addEventListener = noop; g.removeEventListener = noop; g.dispatchEvent = () => true;
  document.defaultView = g;
  const ctx = vm.createContext(g);

  const pending = [];
  for (const s of [...document.querySelectorAll('script')]) {
    const type = (s.getAttribute('type') || '').toLowerCase();
    if (type && type !== 'text/javascript' && type !== 'module') continue; // JSON-LD etc.
    const src = s.getAttribute('src');
    let code = null;
    if (src) { if (RUN_ASSETS.has(src)) code = fs.readFileSync(path.join(ROOT, src), 'utf8'); }
    else code = s.textContent;
    if (!code) continue;
    try { vm.runInContext(code, ctx, { timeout: 2000 }); } catch (e) { pending.push(e); }
  }
  if (pending.length) throw pending[0];
  // let the pages' async init (await fetch → render) finish
  for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));
  return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
}

module.exports = { prerender };
