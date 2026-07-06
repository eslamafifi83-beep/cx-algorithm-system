/*
 * Shared loading screen for The CX Algorithm site.
 * Include right after <body> on every page:  <script src="assets/loader.js"></script>
 * Shows the animated logo overlay on every page load, dismisses on window load
 * (min display 1.1s, hard cap 6s), then dispatches "cx-loader-done" and sets
 * window.__cxLoaderDone so pages can sequence their entrance animations.
 */
(function () {
  if (document.getElementById('loading-screen')) return;

  var css = [
    '#loading-screen .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }',
    '#loading-screen {',
    '  position: fixed; inset: 0; z-index: 999;',
    '  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 46px;',
    '  overflow: hidden;',
    '  background: radial-gradient(120% 120% at 50% 40%, #16294d 0%, #0a1428 60%, rgba(5, 9, 23, 0.02) 100%), #070d1c;',
    "  font-family: 'Oswald', system-ui, sans-serif;",
    '  transition: opacity 0.45s ease;',
    '}',
    '#loading-screen.done { opacity: 0; pointer-events: none; }',
    '.load-badge-fit { width: 400px; height: 400px; }',
    '.load-badge { position: relative; width: 400px; height: 400px; animation: cxBreathe 4.5s ease-in-out infinite; }',
    '.load-halo { position: absolute; inset: -14%; border-radius: 50%; filter: blur(26px); background: radial-gradient(circle, rgba(244, 122, 30, 0.22) 0%, rgba(74, 157, 214, 0.16) 42%, transparent 68%); animation: cxHaloPulse 4.5s ease-in-out infinite; z-index: 0; }',
    '.load-logo { position: relative; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.55)); z-index: 1; }',
    '.load-bars { position: absolute; inset: 0; pointer-events: none; filter: drop-shadow(2px 3px 3px rgba(0, 0, 0, 0.28)); z-index: 2; }',
    '.eq-bar { position: absolute; transform-origin: center; border-radius: 999px; animation: cxEqUp 1.2s ease-in-out infinite; }',
    '.eq-bar.b1 { left: 84.5px;  top: 141px;   width: 13.5px; height: 42.5px;  background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(126,193,229); animation-delay: 0s; }',
    '.eq-bar.b2 { left: 100.5px; top: 122.5px; width: 15px;   height: 78px;    background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(128,192,228); animation-delay: 0.1s; }',
    '.eq-bar.b3 { left: 130.25px; top: 97px;   width: 18.5px; height: 129.5px; background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(125,191,228); animation-delay: 0.2s; }',
    '.eq-bar.b4 { left: 163px;   top: 122.5px; width: 15px;   height: 76.5px;  background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(138,158,192); animation-delay: 0.3s; }',
    '.eq-bar.b5 { left: 190.75px; top: 88.5px; width: 18.5px; height: 123.5px; background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(183,189,207); animation-delay: 0.4s; }',
    '.eq-bar.b6 { left: 221.25px; top: 122px;  width: 15.5px; height: 78.5px;  background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(244,143,39);  animation-delay: 0.5s; }',
    '.eq-bar.b7 { left: 251.5px; top: 98px;    width: 18px;   height: 130.5px; background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(243,131,37);  animation-delay: 0.6s; }',
    '.eq-bar.b8 { left: 283.75px; top: 122.5px; width: 15.5px; height: 78.5px; background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(242,124,33);  animation-delay: 0.7s; }',
    '.eq-bar.b9 { left: 302.5px; top: 140.5px; width: 13px;   height: 43.5px;  background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 32%), rgb(237,109,32);  animation-delay: 0.8s; }',
    '.load-shine { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen; background: linear-gradient(108deg, transparent 42%, rgba(255,255,255,0) 46%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 54%, transparent 58%); background-size: 220% 100%; background-repeat: no-repeat; -webkit-mask: url("assets/logo.png") center / contain no-repeat; mask: url("assets/logo.png") center / contain no-repeat; animation: cxShine 3.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; z-index: 3; }',
    '.load-progress { display: flex; flex-direction: column; align-items: center; gap: 16px; animation: cxRiseIn 0.9s ease 0.15s both; }',
    '.load-track { position: relative; width: 220px; height: 4px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }',
    '.load-fill { position: absolute; width: 40%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #4a9dd6 0%, #eaf0f6 50%, #f47a1e 100%); animation: cxBarSlide 1.5s cubic-bezier(0.65, 0, 0.35, 1) infinite; }',
    '.load-label { font-weight: 500; font-size: 12px; letter-spacing: 6px; color: rgba(207, 220, 236, 0.6); }',
    '@keyframes cxBreathe   { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); } }',
    '@keyframes cxHaloPulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.08); } }',
    '@keyframes cxShine     { 0% { background-position: -160% 0; } 35% { background-position: 260% 0; } 100% { background-position: 260% 0; } }',
    '@keyframes cxBarSlide  { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }',
    '@keyframes cxRiseIn    { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }',
    '@keyframes cxEqUp      { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.42); } }',
    '@media (max-width: 520px) { .load-badge-fit { transform: scale(0.72); margin: -56px 0; } }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .load-badge, .load-halo, .eq-bar, .load-shine, .load-fill, .load-progress { animation: none; }',
    '  .eq-bar { display: none; }',
    '}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'loading-screen';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML =
    '<span class="sr-only">Loading The CX Algorithm Podcast</span>' +
    '<div class="load-badge-fit" aria-hidden="true"><div class="load-badge">' +
    '<div class="load-halo"></div>' +
    '<img class="load-logo" src="assets/logo.png" alt="" />' +
    '<div class="load-bars">' +
    '<div class="eq-bar b1"></div><div class="eq-bar b2"></div><div class="eq-bar b3"></div>' +
    '<div class="eq-bar b4"></div><div class="eq-bar b5"></div><div class="eq-bar b6"></div>' +
    '<div class="eq-bar b7"></div><div class="eq-bar b8"></div><div class="eq-bar b9"></div>' +
    '</div>' +
    '<div class="load-shine"></div>' +
    '</div></div>' +
    '<div class="load-progress" aria-hidden="true">' +
    '<div class="load-track"><div class="load-fill"></div></div>' +
    '<div class="load-label">LOADING</div>' +
    '</div>';
  (document.body || document.documentElement).appendChild(overlay);

  var started = performance.now();
  window.__cxLoaderDone = false;
  function dismiss() {
    if (overlay.classList.contains('done')) return;
    overlay.classList.add('done');
    window.__cxLoaderDone = true;
    try { window.dispatchEvent(new Event('cx-loader-done')); } catch (e) {}
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 600);
  }
  window.addEventListener('load', function () {
    var wait = Math.max(0, 1100 - (performance.now() - started));
    setTimeout(dismiss, wait);
  });
  setTimeout(dismiss, 6000);
})();
