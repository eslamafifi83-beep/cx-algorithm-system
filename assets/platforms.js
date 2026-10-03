/*
 * Where to listen: one list of podcast platforms for the whole site (homepage hero + footer,
 * Episodes page). Each link comes from admin → Links; the verified links below are built in
 * so the site is right even before they have been saved there.
 *
 *   CXPlatforms.resolve(content) -> [{ key, name, url, svg }] in display order, only those with a link
 *
 * Content saved before linksVersion 2 treats an empty link as "use the built-in one"; from
 * linksVersion 2 on (the admin writes it), an empty link hides that platform.
 */
(function () {
  const PLATFORMS = [
    { key: 'spotify', name: 'Spotify',
      svg: '<circle cx="12" cy="12" r="12" fill="#1DB954"/><path d="M6.4 9.2c3.7-1.1 8-.7 11.2 1.1M7 12.3c3.1-.9 6.6-.5 9.3 1M7.6 15.3c2.5-.7 5.1-.4 7.3.8" stroke="#0C1128" stroke-width="1.7" fill="none" stroke-linecap="round"/>' },
    { key: 'apple', name: 'Apple Podcasts',
      svg: '<rect width="24" height="24" rx="6" fill="#A245E0"/><circle cx="12" cy="10.2" r="2.2" fill="#fff"/><path d="M10.8 13.6h2.4l-.45 5.4h-1.5z" fill="#fff"/><path d="M8.1 15a5.6 5.6 0 1 1 7.8 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M6.3 17.1a8.1 8.1 0 1 1 11.4 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".8"/>' },
    { key: 'youtube', name: 'YouTube',
      svg: '<rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0033"/><path d="M10 8.9v6.2l5.3-3.1z" fill="#fff"/>' },
    { key: 'amazon', name: 'Amazon Music',
      svg: '<rect width="24" height="24" rx="6.5" fill="#1F9FE8"/><path d="M9.2 15.2V8.2l6-1.3v6.4" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7.9" cy="15.4" r="1.7" fill="#fff"/><circle cx="13.9" cy="13.5" r="1.7" fill="#fff"/><path d="M6.2 18.6c3.6 1.6 8 1.6 11.6-.3" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round"/>' },
    { key: 'iheart', name: 'iHeartRadio',
      svg: '<path d="M12 21s-8.8-5.3-8.8-11.5A5 5 0 0 1 12 6.6a5 5 0 0 1 8.8 2.9C20.8 15.7 12 21 12 21z" fill="#C6002B"/><path d="M9 10.9a3.3 3.3 0 0 0 0 3.6M15 10.9a3.3 3.3 0 0 1 0 3.6M7.2 9.5a5.6 5.6 0 0 0 0 6.4M16.8 9.5a5.6 5.6 0 0 1 0 6.4" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="12.7" r="1.2" fill="#fff"/>' },
    { key: 'audible', name: 'Audible',
      svg: '<rect width="24" height="24" rx="6" fill="#F7991C"/><path d="M4.6 11.3c4.6-3.4 10.2-3.4 14.8 0M7.4 13.9c3.1-2.2 6.1-2.2 9.2 0M10 16.4c1.3-.9 2.7-.9 4 0" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>' },
    { key: 'pocketcasts', name: 'Pocket Casts',
      svg: '<circle cx="12" cy="12" r="12" fill="#F43E37"/><path d="M12 4.6a7.4 7.4 0 1 0 7.4 7.4h-2.2A5.2 5.2 0 1 1 12 6.8z" fill="#fff"/><path d="M12 8.7a3.3 3.3 0 1 0 3.3 3.3h-1.9A1.4 1.4 0 1 1 12 10.6z" fill="#fff"/>' },
    { key: 'deezer', name: 'Deezer',
      svg: '<rect width="24" height="24" rx="6" fill="#A238FF"/><path d="M5.5 17.5h2.6M9.4 17.5h2.6M13.3 17.5h2.6M17.2 17.5h1.3M9.4 14.6h2.6M13.3 14.6h2.6M17.2 14.6h1.3M13.3 11.7h2.6M17.2 11.7h1.3M17.2 8.8h1.3M17.2 5.9h1.3" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>' },
    { key: 'tunein', name: 'TuneIn',
      svg: '<rect width="24" height="24" rx="6" fill="#14D8CC"/><path d="M5.5 7.5h13v8.2h-7.3l-3.2 2.8v-2.8H5.5z" fill="#0C1128"/><path d="M9 10.4h6M9 12.9h4" stroke="#14D8CC" stroke-width="1.4" stroke-linecap="round"/>' },
    { key: 'pandora', name: 'Pandora',
      svg: '<rect width="24" height="24" rx="6" fill="#224099"/><path d="M8.6 18.4V5.8h4.6a4 4 0 0 1 0 8h-1.6v4.6z" fill="#fff"/>' }
  ];

  // Verified listings (checked 3 Oct 2026)
  const DEFAULTS = {
    spotify: 'https://open.spotify.com/show/4jUMZl3zVFcI2uFWaVadQk',
    apple: 'https://podcasts.apple.com/au/podcast/the-cx-algorithm/id1868364883',
    youtube: 'https://www.youtube.com/@TheCXAlgorithmPodcast',
    amazon: 'https://music.amazon.com.au/podcasts/0a2c3a20-bd08-48cf-891e-ca59f63a76e5/the-cx-algorithm',
    iheart: 'https://www.iheart.com/podcast/1333-the-cx-algorithm-317661171/',
    audible: 'https://www.audible.com.au/podcast/The-CX-Algorithm/B0GGCF9T5V',
    pocketcasts: 'https://pocketcasts.com/podcast/the-cx-algorithm/a5fa9820-0fe2-013f-57cf-02366ae7f0f7'
  };

  function resolve(content) {
    const saved = (content && content.links) || {};
    const v2 = !!content && Number(content.linksVersion) >= 2;
    return PLATFORMS.map(p => {
      const own = String(saved[p.key] || '').trim();
      return Object.assign({}, p, { url: v2 ? own : (own || DEFAULTS[p.key] || '') });
    }).filter(p => /^https?:\/\//i.test(p.url));
  }

  const icon = (p, size) => `<svg viewBox="0 0 24 24" width="${size || 24}" height="${size || 24}" aria-hidden="true" focusable="false">${p.svg}</svg>`;

  window.CXPlatforms = { list: PLATFORMS, defaults: DEFAULTS, resolve, icon };
})();
