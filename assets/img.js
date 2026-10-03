/* Lighter images. On the live site, photos and covers go through Vercel's image optimiser:
 * resized to the size they're shown at, converted to WebP and cached at the edge
 * (a 2 MB cover becomes ~60 KB). Anywhere else (local preview) the original file is used.
 *
 *   CXImg(src, width)        -> address for an image shown `width` CSS pixels wide
 *   CXImg.set(img, src, width) -> point an <img> at it (clears any srcset)
 *
 * If the optimiser ever fails for an image, it falls back to the original automatically.
 * Load in <head>, before other scripts.
 */
(function () {
  var SIZES = [64, 128, 256, 384, 640, 828, 1080, 1600, 2048];   // must match "images.sizes" in vercel.json
  var LIVE = /(^|\.)thecxalgorithm\.com$/.test(location.hostname);
  var OPTIMISABLE = /^(\/assets\/|https:\/\/fuuuhcvwlrfenjfpcymy\.supabase\.co\/storage\/v1\/object\/public\/)[^?#]+\.(png|jpe?g|webp)$/i;

  function CXImg(src, width, quality) {
    src = String(src || '');
    if (/^assets\//.test(src)) src = '/' + src;
    if (!LIVE || !OPTIMISABLE.test(src)) return src;
    var want = Math.round((width || 640) * Math.min(window.devicePixelRatio || 1, 2));
    var w = SIZES[SIZES.length - 1];
    for (var i = 0; i < SIZES.length; i++) if (SIZES[i] >= want) { w = SIZES[i]; break; }
    return '/_vercel/image?url=' + encodeURIComponent(src) + '&w=' + w + '&q=' + (quality || 75);
  }
  // Images already showing this file (data-src on the markup) are left alone, keeping their srcset
  CXImg.set = function (img, src, width) {
    if (!img || !src) return;
    var file = /^assets\//.test(src) ? '/' + src : src;
    if (img.getAttribute('data-src') === file) return;
    img.setAttribute('data-src', file);
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = CXImg(file, width);
  };

  // Safety net: an optimised image that fails to load falls back to the original
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG' || t.getAttribute('data-orig-tried')) return;
    var m = /\/_vercel\/image\?url=([^&]+)/.exec(t.currentSrc || t.src || '');
    if (!m) return;
    t.setAttribute('data-orig-tried', '1');
    t.removeAttribute('srcset');
    t.src = decodeURIComponent(m[1]);
  }, true);

  window.CXImg = CXImg;
})();
