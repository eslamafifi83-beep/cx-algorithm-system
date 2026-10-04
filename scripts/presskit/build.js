// Press kit v2: editorial, photo-led, 4 x A4. Usage: node build2.js [page]  (page = 1..4 renders only that page)
const fs = require('fs');
const path = require('path');
const REPO = 'C:/Users/eslam/MOCKUPS/cx-algorithm-system';
const c = require('./content.json'); // fetch first: curl -s https://www.thecxalgorithm.com/api/content -o content.json
const only = Number(process.argv[2] || 0);
const f = p => 'file:///' + path.join(REPO, p).replace(/\\/g, '/');
const esc = s => String(s || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const opt = (u, w) => 'https://www.thecxalgorithm.com/_vercel/image?url=' + encodeURIComponent(/^https?:/.test(u) ? u : '/' + u) + '&w=' + w + '&q=80';

const guests = c.guests.items;
const g = name => guests.find(x => x.name === name) || {};
const logoOf = ref => { const m = c.marquee.items.find(x => x.name === ref); return m ? m.logo : ''; };
const eps = c.episodes.map((e, i) => ({ n: String(i + 1).padStart(2, '0'), title: e.title, guest: e.guest, role: g(e.guest).role, company: g(e.guest).company, photo: g(e.guest).photo, logo: logoOf(g(e.guest).companyRef) })).reverse();
const lenses = [
  ['Human behaviour', 'The psychology behind why customers choose, stay, or walk away.'],
  ['Loyalty & trust', 'Building loyalty that survives a bad day.'],
  ['Experience design', 'Turning journeys and touchpoints into memorable moments.'],
  ['Data & growth', 'Measurement that predicts behaviour instead of describing it.'],
  ['AI & automation', 'Where intelligent systems help, and where they quietly hurt.'],
  ['Connected teams', 'Aligning service, product and marketing around the customer.']
];
const logos = c.marquee.items;

const short = {
  '08': 'Before You Think, the Room Has Already Spoken',
  '07': "You Don't Remember Your Last Payment",
  '06': 'Channels Are Delivery Mechanisms. Journeys Are the Product.',
  '05': 'Everything Is an Optimisation Problem',
  '04': 'The Three Pillars of Unbeatable CX',
  '03': 'Beyond the AI Hype',
  '02': 'Back to the Middle',
  '01': 'AI, Attention, and Why Augmentation Creates Real Value'
};
const wave = (() => {
  const N = 72, W = 210, H = 70, gap = W / N, bw = gap * 0.52;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let bars = '';
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1);
    const env = 0.22 + 0.78 * Math.pow(Math.sin(Math.PI * x), 1.3) * (0.55 + 0.45 * Math.sin(x * 9.5 + 0.6));
    const h = Math.max(2.2, H * Math.min(1, env * (0.62 + 0.38 * rnd())));
    bars += '<rect x="' + (i * gap + (gap - bw) / 2).toFixed(2) + '" y="' + ((H - h) / 2).toFixed(2) + '" width="' + bw.toFixed(2) + '" height="' + h.toFixed(2) + '" rx="' + (bw / 2).toFixed(2) + '"/>';
  }
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="210mm" height="70mm" preserveAspectRatio="none"><defs><linearGradient id="wg" gradientUnits="userSpaceOnUse" x1="0" x2="210" y1="0" y2="0"><stop offset="0" stop-color="#2F7BFF"/><stop offset=".28" stop-color="#6FC3FF"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset=".72" stop-color="#FFB766"/><stop offset="1" stop-color="#FF7A2F"/></linearGradient></defs><g fill="url(#wg)">' + bars + '</g></svg>';
})();

const CROPS = {"IE University":{"w":600,"h":400,"x0":0,"y0":78,"x1":599,"y1":320},"Openbank":{"w":800,"h":245,"x0":0,"y0":0,"x1":799,"y1":244},"Energy Exemplar":{"w":306,"h":174,"x0":17,"y0":19,"x1":269,"y1":173},"World Journeys":{"w":600,"h":600,"x0":8,"y0":168,"x1":591,"y1":430},"Gamechangers España":{"w":325,"h":67,"x0":0,"y0":9,"x1":315,"y1":66},"Mastercard":{"w":507,"h":394,"x0":0,"y0":0,"x1":506,"y1":393},"COX Architecture":{"w":2734,"h":744,"x0":92,"y0":0,"x1":2633,"y1":743},"Samsung":{"w":24,"h":4.07,"x0":0,"y0":0,"x1":24,"y1":4.07}};
const logoRef = name => (guests.find(x => x.name === name) || {}).companyRef;
const plate = (guest, logo) => {
  if (!logo) return '';
  const k = CROPS[logoRef(guest)];
  const src = /^https?:/.test(logo) ? logo : f(logo);
  if (!k) return '<span class="plate"><img class="pl-img" src="' + src + '" alt=""></span>';
  const cw = k.x1 - k.x0 + 1, ch = k.y1 - k.y0 + 1, ratio = cw / ch;
  const hmm = Math.min(6.2, 20 / ratio), wmm = hmm * ratio;
  return '<span class="plate"><span class="lg" style="width:' + wmm.toFixed(2) + 'mm;height:' + hmm.toFixed(2) + 'mm"><img src="' + src + '" alt="" style="width:' + (k.w / cw * 100).toFixed(3) + '%;left:' + (-k.x0 / cw * 100).toFixed(3) + '%;top:' + (-k.y0 / ch * 100).toFixed(3) + '%"></span></span>';
};
const show = n => (!only || only === n) ? '' : ' style="display:none"';

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>The CX Algorithm — Press Kit</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
@font-face{font-family:Poppins;font-weight:300;src:url(${f('assets/fonts/poppins-400-latin.woff2')})}
@font-face{font-family:Poppins;font-weight:400;src:url(${f('assets/fonts/poppins-400-latin.woff2')})}
@font-face{font-family:Poppins;font-weight:500;src:url(${f('assets/fonts/poppins-500-latin.woff2')})}
@font-face{font-family:Poppins;font-weight:600;src:url(${f('assets/fonts/poppins-600-latin.woff2')})}
@font-face{font-family:Poppins;font-weight:700;src:url(${f('assets/fonts/poppins-700-latin.woff2')})}
@font-face{font-family:Poppins;font-weight:800;src:url(${f('assets/fonts/poppins-800-latin.woff2')})}
@font-face{font-family:Oswald;src:url(${f('assets/fonts/oswald-latin.woff2')})}
@page{size:A4;margin:0}
:root{--navy:#0B1026;--navy2:#121a3a;--rule:rgba(255,255,255,.14);--gold:#E9A33D;--gold-d:#B8781F;--ink:#0B1026;--grey:#5E6482;--paper:#F6F3EC;--line:#DDD6C6}
*{box-sizing:border-box;margin:0;padding:0}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:Poppins,Arial,sans-serif;color:var(--ink);background:#fff}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;break-after:page}
.page:last-of-type{break-after:auto}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400}
.kick{font-family:Oswald,sans-serif;font-size:8pt;letter-spacing:.32em;text-transform:uppercase;color:var(--gold)}
.paper{background:var(--paper)}
.paper .kick{color:var(--gold-d)}
.navy{background:var(--navy);color:#fff}
.folio{position:absolute;left:18mm;right:18mm;bottom:10mm;display:flex;justify-content:space-between;font-family:Oswald;font-size:7pt;letter-spacing:.25em;text-transform:uppercase;color:#9AA0B8}
.paper .folio{color:#A39B88}

/* 1 — cover */
.cover{background:#05081a url(${f('assets/stage/hx-sydney.jpg')}) no-repeat;background-size:160% auto;background-position:100% 67%}
.cover::before{content:"";position:absolute;inset:0;background:
  linear-gradient(180deg,rgba(5,8,26,.78) 0%,rgba(5,8,26,.15) 22%,rgba(5,8,26,0) 40%,rgba(5,8,26,.55) 62%,rgba(5,8,26,.97) 82%),
  linear-gradient(90deg,rgba(5,8,26,.55) 0%,rgba(5,8,26,0) 55%)}
.cover .top{position:absolute;left:18mm;right:18mm;top:15mm;display:flex;justify-content:space-between;align-items:center;z-index:1}
.mark{display:flex;align-items:center;gap:3.5mm;color:#fff}
.mark img{width:13mm;height:13mm;border-radius:2.5mm}
.mark b{font-size:10.5pt;letter-spacing:.14em;font-weight:600;display:block}
.mark small{font-family:Oswald;font-size:7pt;letter-spacing:.34em;color:var(--gold)}
.cover .top .kick{color:#fff;opacity:.85}
.cover .title{position:absolute;left:18mm;right:18mm;bottom:30mm;z-index:1;color:#fff}
.cover h1{font-size:50pt;line-height:.98;font-weight:800;letter-spacing:-.02em;margin:5mm 0 7mm}
.cover h1 .serif{font-style:italic;font-weight:400;color:var(--gold);font-size:58pt;letter-spacing:0}
.cover .who{display:flex;gap:10mm;align-items:flex-end;border-top:1px solid rgba(255,255,255,.28);padding-top:5mm}
.cover .who b{font-size:13pt;font-weight:600;display:block}
.cover .who span{font-size:9pt;color:#C9CEE3}
.cover .where{margin-left:auto;text-align:right;font-family:Oswald;font-size:7.5pt;letter-spacing:.25em;text-transform:uppercase;color:#C9CEE3}

/* 2 — host */
.hostphoto{height:126mm;background:url(${f('assets/stage/hx-sydney.jpg')}) no-repeat;background-size:cover;background-position:50% 57%;position:relative}
.hostphoto::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,38,0) 60%,rgba(11,16,38,.6))}
.cap{position:absolute;left:18mm;bottom:6mm;z-index:1;font-family:Oswald;font-size:7.5pt;letter-spacing:.25em;text-transform:uppercase;color:#fff}
.host-body{padding:10mm 18mm 0;display:grid;grid-template-columns:1.35fr 1fr;gap:12mm}
.host-body h2{font-size:30pt;font-weight:800;letter-spacing:-.015em;line-height:1;margin:3mm 0 2.5mm}
.roles{font-size:8.2pt;color:var(--grey);margin-bottom:5mm;white-space:nowrap}
.bio p{font-size:9.6pt;line-height:1.6;margin-bottom:3mm}
.cred{border-top:1px solid var(--line);padding:3.2mm 0}
.cred:last-child{border-bottom:1px solid var(--line)}
.cred b{font-size:10pt;font-weight:600;display:block}
.cred span{font-size:8.2pt;color:var(--grey);display:block;line-height:1.4;margin-top:.6mm}
.figs{margin:7mm 18mm 0;display:grid;grid-template-columns:repeat(4,1fr);border-top:1.5px solid var(--ink)}
.fig{padding-top:4mm}
.fig b{display:block;font-family:Oswald;font-weight:400;font-size:26pt;line-height:1;color:var(--ink)}
.fig b em{font-style:normal;color:var(--gold-d)}
.fig span{display:block;font-size:7.8pt;color:var(--grey);margin-top:1.5mm;line-height:1.35}

/* 3 — podcast */
.pod{padding:16mm 18mm 0}
.pod h2{font-size:27pt;font-weight:700;line-height:1.08;letter-spacing:-.01em;margin:4mm 0 4mm;max-width:150mm}
.pod h2 .serif{font-style:italic;color:var(--gold);font-weight:400;font-size:31pt}
.pod .lede{font-size:10pt;line-height:1.6;color:#C9CEE3;max-width:150mm}
.nums{display:grid;grid-template-columns:repeat(4,1fr);margin-top:8mm;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.nums div{padding:4.5mm 0 4mm}
.nums b{display:block;font-family:Oswald;font-weight:400;font-size:24pt;line-height:1;color:var(--gold)}
.nums span{font-size:8pt;color:#C9CEE3}
.eps{margin-top:7mm}
.ep{display:grid;grid-template-columns:12mm 9mm 1fr;gap:4mm;align-items:center;padding:2.4mm 0;border-bottom:1px solid var(--rule)}
.ep .n{font-family:Oswald;font-size:10pt;color:var(--gold);letter-spacing:.08em}
.ep img{width:9mm;height:9mm;border-radius:50%;object-fit:cover;object-position:center 22%}
.ep .t{font-size:8.9pt;font-weight:600;line-height:1.3}
.ep .w{font-size:7.6pt;color:#9AA0B8;margin-top:.5mm}
.from{margin-top:7mm;display:flex;align-items:center;gap:5mm}
.from .kick{white-space:nowrap}
.from .row{display:grid;grid-template-columns:repeat(8,1fr);gap:2mm;flex:1}
.from .row div{background:#fff;border-radius:1.5mm;height:10mm;display:flex;align-items:center;justify-content:center;padding:1.6mm 2mm}
.from img{max-width:100%;max-height:100%;object-fit:contain}
.listen{margin-top:5mm;font-size:8.2pt;color:#C9CEE3;line-height:1.6}
.listen b{color:#fff;font-weight:600}

/* 4 — speaking + contact */
.room{height:74mm;background:url(${f('assets/stage/xi-forum-audience.jpg')}) no-repeat;background-size:cover;background-position:30% 55%;position:relative}
.room::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,38,0) 55%,rgba(11,16,38,.55))}
.speak{padding:11mm 18mm 0}
.quote{font-size:21pt;line-height:1.18;letter-spacing:-.005em;color:var(--ink);max-width:165mm;margin:3mm 0 3mm}
.quote em{color:var(--gold-d)}
.attr{font-size:8pt;color:var(--grey);margin-bottom:8mm}
.lenses{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm 8mm;border-top:1.5px solid var(--ink);padding-top:5mm;margin-top:3mm}
.lens i{font-style:normal;font-family:Oswald;font-size:9pt;color:var(--gold-d);letter-spacing:.1em}
.lens b{display:block;font-size:10pt;font-weight:600;margin:1mm 0 1mm}
.lens span{font-size:8pt;color:var(--grey);line-height:1.45;display:block}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:7mm;font-size:8.5pt;color:var(--grey);line-height:1.55}
.meta b{color:var(--ink);font-weight:600}
.contact{position:absolute;left:0;right:0;bottom:0;height:60mm;align-items:start;background:var(--navy);color:#fff;padding:11mm 18mm 0;display:grid;grid-template-columns:1fr auto;gap:10mm}
.contact h3{font-size:19pt;font-weight:700;line-height:1.15;margin:3mm 0 3mm;letter-spacing:-.01em}
.contact h3 .serif{font-style:italic;color:var(--gold);font-weight:400;font-size:22pt}
.contact p{font-size:8.6pt;color:#C9CEE3;line-height:1.55}
.reach{text-align:right;padding-top:5mm}
.reach .mail{font-size:13pt;font-weight:600;color:var(--gold)}
.reach div{font-size:9pt;color:#E4E7F2;line-height:1.9}


/* v3 podcast cover */
.pcover{background:var(--navy);color:#fff}
.pcover .glow{position:absolute;right:-70mm;top:-60mm;width:200mm;height:200mm;border-radius:50%;background:radial-gradient(circle,rgba(233,163,61,.20),rgba(233,163,61,0) 60%)}
.pcover .top{position:absolute;left:18mm;right:18mm;top:15mm;display:flex;justify-content:space-between;align-items:center;z-index:1}
.pc-head{position:absolute;left:18mm;right:18mm;top:36mm;display:grid;grid-template-columns:1fr 50mm;gap:8mm;align-items:start}
.pc-head h1{font-size:44pt;line-height:1;font-weight:800;letter-spacing:-.02em;margin:4mm 0 6mm}
.pc-head h1 .serif{font-style:italic;font-weight:400;color:var(--gold);font-size:52pt;letter-spacing:0}
.pc-lede{font-size:10.5pt;line-height:1.6;color:#C9CEE3}
.art{width:50mm;height:50mm;border-radius:5mm;box-shadow:0 8mm 20mm rgba(0,0,0,.45);margin-top:6mm}
.mosaic{position:absolute;left:0;right:0;top:136mm;display:grid;grid-template-columns:repeat(4,1fr);gap:1mm;background:var(--navy)}
.mosaic img{width:100%;aspect-ratio:16/9;object-fit:cover;object-position:center top;display:block}
.pc-stats{position:absolute;left:18mm;right:18mm;top:208mm;display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--rule)}
.pc-stats div{padding:0 0 5mm}
.pc-stats b{display:block;font-family:Oswald;font-weight:400;font-size:30pt;line-height:1;color:var(--gold)}
.pc-stats span{font-size:8.5pt;color:#C9CEE3}
.pc-host{position:absolute;left:18mm;right:18mm;top:241mm;display:flex;align-items:center;gap:5mm}
.pc-host img{width:17mm;height:17mm;border-radius:50%;object-fit:cover;border:1.5px solid var(--gold)}
.pc-host b{display:block;font-size:12pt;font-weight:600;margin-top:1mm}
.pc-host .sub{font-size:8.2pt;color:#C9CEE3;white-space:nowrap}
.pc-listen{margin-left:auto;text-align:right;font-size:8.2pt;line-height:1.65;color:#C9CEE3;white-space:nowrap}
/* v3 podcast detail */
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:7mm;margin-top:7mm;border-top:1px solid var(--rule);padding-top:5mm}
.facts p{font-size:8.4pt;line-height:1.5;color:#C9CEE3;margin-top:2mm}
.ctas{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:7mm}
.cta{border:1px solid rgba(233,163,61,.45);border-radius:3mm;padding:5mm}
.cta h3{font-size:13pt;font-weight:700;margin:2mm 0 2mm}
.cta p{font-size:8.4pt;line-height:1.5;color:#C9CEE3}

/* v4 podcast pages */
.glow4{position:absolute;left:-40mm;right:-40mm;top:95mm;height:110mm;background:radial-gradient(ellipse at center,rgba(111,195,255,.16),rgba(255,140,60,.08) 45%,rgba(11,16,38,0) 70%)}
.top4{position:absolute;left:18mm;right:18mm;top:15mm;display:flex;justify-content:space-between;align-items:center;z-index:1}
.p1-title{position:absolute;left:18mm;right:18mm;top:38mm}
.p1-title h1{font-size:64pt;line-height:.92;font-weight:800;letter-spacing:-.03em;margin:4mm 0 4mm}
.tagline{font-size:28pt;font-style:italic;color:var(--gold);line-height:1}
.wave{position:absolute;left:0;right:0;top:118mm;height:70mm}
.wave svg{display:block}
.p1-body{position:absolute;left:18mm;right:18mm;top:196mm;display:grid;grid-template-columns:1fr 1fr;gap:10mm;align-items:start}
.p1-lede{font-size:9.8pt;line-height:1.6;color:#C9CEE3}
.p1-stats{display:grid;grid-template-columns:1fr 1fr;gap:4mm 6mm}
.p1-stats b{display:block;font-family:Oswald;font-weight:400;font-size:26pt;line-height:1;color:var(--gold)}
.p1-stats span{font-size:8pt;color:#C9CEE3}
.p1-foot{position:absolute;left:18mm;right:18mm;top:247mm;display:flex;align-items:center;gap:6mm;border-top:1px solid var(--rule);padding-top:6mm}
.faces{display:flex;flex-shrink:0}
.faces img{width:11mm;height:11mm;border-radius:50%;object-fit:cover;object-position:center 22%;border:1.4px solid var(--navy);margin-left:-3mm;filter:grayscale(1) contrast(1.05)}
.faces img:first-child{margin-left:0}
.feat p{font-size:8pt;color:#C9CEE3;line-height:1.45;margin-top:1mm}
.by{margin-left:auto;text-align:right;flex-shrink:0}
.by b{display:block;font-size:11pt;font-weight:600;margin-top:1mm;white-space:nowrap}
.p2-wrap{padding:14mm 18mm 0}
.p2-wrap h2{font-size:25pt;font-weight:700;line-height:1.08;letter-spacing:-.01em;margin:3mm 0 6mm;max-width:160mm}
.p2-wrap h2 .serif{font-style:italic;color:var(--gold);font-weight:400;font-size:29pt}
.guests{display:grid;grid-template-columns:repeat(4,1fr);gap:6mm 5mm}
.gimg{width:100%;aspect-ratio:1/1;border-radius:2mm;background-size:cover;background-position:center 22%;margin-bottom:2.6mm;overflow:hidden}
.gimg::before{content:"";position:absolute;inset:0;background:inherit;background-size:cover;background-position:center 22%;filter:grayscale(1) contrast(1.06)}
.plate{z-index:1}
.gep{display:block;font-family:Oswald;font-size:7.5pt;letter-spacing:.2em;color:var(--gold)}
.gcard b{display:block;font-size:9.2pt;font-weight:600;line-height:1.25;margin:.8mm 0 .6mm}
.grole{display:block;font-size:7pt;color:#9AA0B8;line-height:1.35}
.gt{display:block;font-style:italic;font-size:9.8pt;line-height:1.2;color:#E8E2D2;margin-top:1.6mm}
.facts4{display:grid;grid-template-columns:repeat(3,1fr);gap:7mm;margin-top:6mm;border-top:1px solid var(--rule);padding-top:5mm}
.facts4 p{font-size:8.2pt;line-height:1.5;color:#C9CEE3;margin-top:1.8mm}
.invite{margin-top:5mm;border:1px solid rgba(233,163,61,.5);border-radius:3mm;padding:4.5mm 5mm;display:flex;align-items:center;gap:8mm}
.invite p{font-size:8.4pt;line-height:1.5;color:#C9CEE3;margin-top:1.5mm}
.invite b{margin-left:auto;font-size:12pt;font-weight:600;color:var(--gold);white-space:nowrap}

/* v5 */
.glow4{display:none}
.band{position:absolute;left:0;right:0;top:112mm;height:74mm;display:grid;grid-template-columns:repeat(8,1fr);gap:.8mm}
.band div{background-size:cover;background-position:center 20%;filter:grayscale(1) contrast(1.08) brightness(.92)}
.band::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,38,.25),rgba(11,16,38,0) 30%,rgba(11,16,38,0) 70%,rgba(11,16,38,.35))}
.gimg{position:relative}
.plate{position:absolute;left:2mm;bottom:2mm;background:#fff;border-radius:1.4mm;height:9mm;min-width:13mm;display:flex;align-items:center;justify-content:center;padding:0 2.2mm;filter:grayscale(0);box-shadow:0 .6mm 2mm rgba(0,0,0,.35)}
.lg{position:relative;display:block;overflow:hidden}
.lg img{position:absolute;max-width:none;display:block}

/* v8 cover options */
.c-stats{display:grid;grid-template-columns:repeat(4,1fr)}
.c-stats b{display:block;font-family:Oswald;font-weight:400;font-size:24pt;line-height:1;color:var(--gold)}
.c-stats span{font-size:8pt;color:#C9CEE3}
.c-host b{display:block;font-size:11.5pt;font-weight:600;margin:1mm 0 1mm}
.c-host span:last-child{font-size:8pt;color:#C9CEE3;line-height:1.45}
/* A: album cover */
.a-glow{position:absolute;left:50%;top:92mm;width:190mm;height:190mm;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(79,155,255,.30) 0%,rgba(255,138,61,.16) 38%,rgba(11,16,38,0) 66%)}
.a-art{position:absolute;left:50%;top:92mm;width:104mm;height:104mm;transform:translate(-50%,-50%)}
.a-art img{width:100%;height:100%;display:block;filter:drop-shadow(0 10mm 18mm rgba(0,0,0,.5))}
.a-text{position:absolute;left:18mm;right:18mm;top:156mm;text-align:center}
.a-text h1{font-size:38pt;line-height:1.02;font-weight:800;letter-spacing:-.02em;margin:3.5mm 0 4mm}
.a-text h1 .serif{font-style:italic;font-weight:400;color:var(--gold);font-size:45pt;letter-spacing:0}
.a-lede{font-size:10pt;line-height:1.6;color:#C9CEE3;max-width:150mm;margin:0 auto}
.a-bottom{position:absolute;left:18mm;right:18mm;top:218mm;display:grid;grid-template-columns:1fr;gap:7mm;border-top:1px solid var(--rule);padding-top:6mm}
.a-bottom .c-stats{text-align:center}
.a-bottom .c-host{text-align:center}
/* B: quotes */
.b-title{position:absolute;left:18mm;right:18mm;top:36mm}
.b-title h1{font-size:40pt;line-height:1;font-weight:800;letter-spacing:-.02em;margin:3mm 0 2mm}
.b-tag{font-size:21pt;font-style:italic;color:var(--gold)}
.b-quotes{position:absolute;left:18mm;right:18mm;top:84mm;border-top:1px solid var(--rule);padding-top:7mm}
.bq{margin:7mm 0 0}
.bq blockquote{font-size:21pt;line-height:1.16;color:#EDEAF3}
.bq.big blockquote{font-size:34pt;line-height:1.06;color:#fff}
.bq figcaption{font-size:8.2pt;color:#9AA0B8;margin-top:2.2mm}
.bq figcaption b{color:#fff;font-weight:600}
.bq figcaption i{font-style:normal;font-family:Oswald;letter-spacing:.18em;color:var(--gold);margin-left:2mm;font-size:7.5pt}
.b-bottom{position:absolute;left:18mm;right:18mm;top:236mm;display:grid;grid-template-columns:1.6fr 1fr;gap:8mm;align-items:end;border-top:1px solid var(--rule);padding-top:6mm}
.b-bottom .c-host{text-align:right}
</style></head><body>

<section class="page navy"${show(1)}>
  <div class="top4"><div class="mark"><img src="${f('assets/logo.png')}" alt=""><div><b>THE CX ALGORITHM</b><small>PODCAST</small></div></div><span class="kick" style="color:#fff;opacity:.85">Press kit · 2026</span></div>
  <div class="a-glow"></div>
  <div class="a-art"><img src="${f('assets/logo.png')}" alt=""></div>
  <div class="a-text">
    <p class="kick">The podcast</p>
    <h1>Great experiences, <span class="serif">decoded.</span></h1>
    <p class="a-lede">Conversations with the leaders reshaping customer experience, data and AI — real problems, real decisions, and what actually works beyond the hype.</p>
  </div>
  <div class="a-bottom"><div class="c-stats">
      <div><b>40K+</b><span>Listeners</span></div>
      <div><b>${c.episodes.length}</b><span>Episodes</span></div>
      <div><b>7</b><span>Countries</span></div>
      <div><b>7+</b><span>Industries</span></div>
    </div>
    <div class="c-host"><span class="kick">Hosted by</span><b>Dr Eslam Afifi</b><span>Featuring leaders from Samsung, Mastercard, Openbank by Santander, IE University, COX Architecture and more</span></div>
  </div>
  <div class="folio"><span>The CX Algorithm · Press kit</span><span>01</span></div>
</section>

<section class="page navy"${show(2)}>
  <div class="p2-wrap">
    <p class="kick">The guests</p>
    <h2>Conversations with the people building <span class="serif">better experiences.</span></h2>
    <div class="guests">${eps.map(e => `<div class="gcard"><div class="gimg" style="background-image:url('${opt(e.photo, 384)}')">${plate(e.guest, e.logo)}</div><span class="gep">EP ${e.n}</span><b>${esc(e.guest)}</b><span class="grole">${esc(e.role || '')}${e.company ? ', ' + esc(e.company) : ''}</span><span class="gt serif">${esc(short[e.n] || e.title)}</span></div>`).join('')}</div>
    <div class="facts4">
      <div><span class="kick">The format</span><p>Long-form video conversations, 20 to 35 minutes, built around one big idea and the decisions behind it.</p></div>
      <div><span class="kick">Everywhere</span><p>Spotify, Apple Podcasts, YouTube, Amazon Music, iHeartRadio, Audible, Pocket Casts, Deezer, TuneIn and Pandora.</p></div>
      <div><span class="kick">Every episode</span><p>Its own page at thecxalgorithm.com with the full transcript, chapters, key takeaways and resources.</p></div>
    </div>
    <div class="invite">
      <div><span class="kick">Be a guest · Partner with the show</span><p>Leaders with a real story about CX, data or AI, and partners who want to reach CX, insights, digital and product leaders.</p></div>
      <b>hello@thecxalgorithm.com</b>
    </div>
  </div>
  <div class="folio"><span>The CX Algorithm · Press kit</span><span>02</span></div>
</section>

<section class="page paper"${show(3)}>
  <div class="hostphoto"><span class="cap">On stage · HX Forum, Sydney</span></div>
  <div class="host-body">
    <div>
      <p class="kick">The host</p>
      <h2>Dr Eslam Afifi</h2>
      <p class="roles">Podcast host · Keynote speaker · Board member</p>
      <div class="bio">
        <p>A CX and data leader with over 15 years of experience helping organisations across Australia, Europe and the GCC. His work sits where customer experience, Voice of Customer and AI-enabled insights meet, and his belief is simple: great experiences don't come from one element alone. They're created through the right algorithm of people, data and technology.</p>
        <p>He created The CX Algorithm to bring together the innovators, leaders and storytellers who each add something unique to that formula, and to challenge how AI and CX really create value.</p>
      </div>
    </div>
    <div>
      <p class="kick">Credentials</p>
      <div style="margin-top:4mm">${c.about.credentials.map(x => `<div class="cred"><b>${esc(x.title)}, ${esc(x.org)}</b><span>${esc(x.note)}</span></div>`).join('')}</div>
    </div>
  </div>
  <div class="figs">
    <div class="fig"><b>15<em>+</em></b><span>Years across Australia,<br>Europe and the GCC</span></div>
    <div class="fig"><b>30<em>+</em></b><span>Stages spoken on</span></div>
    <div class="fig"><b>4</b><span>Continents lived<br>and worked</span></div>
    <div class="fig"><b>40K<em>+</em></b><span>Podcast listeners</span></div>
  </div>
  <div class="folio"><span>The CX Algorithm · Press kit</span><span>03</span></div>
</section>

<section class="page paper"${show(4)}>
  <div class="room"><span class="cap">XI Forum · Sydney</span></div>
  <div class="speak">
    <p class="kick">Speaking</p>
    <p class="quote serif">“The best CX leaders don't chase technology. They fall in love with customer problems — <em>and let the right solution emerge.</em>”</p>
    <p class="attr">Dr Eslam Afifi, keynote at HX Forum Sydney</p>
    <p class="kick">Six lenses on customer experience</p>
    <div class="lenses">${lenses.map(([n, l], i) => `<div class="lens"><i>0${i + 1}</i><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <div class="meta">
      <div><b>Formats</b><br>Keynotes, panels, fireside chats and workshops. Advisory and podcast guesting. In the room or live on screen.</div>
      <div><b>Seen at</b><br>${c.about.seenAt.map(esc).join(' · ')}</div>
    </div>
  </div>
  <div class="contact">
    <div>
      <p class="kick">Book · Pitch · Partner</p>
      <h3>Let's create something <span class="serif">worth talking about.</span></h3>
      <p>Speaking, advisory, a guest for the show, sponsorship or press.<br>Typical reply within 2 business days.</p>
    </div>
    <div class="reach"><span class="mail">hello@thecxalgorithm.com</span><div>thecxalgorithm.com<br>linkedin.com/in/eslam-afifi</div></div>
  </div>
</section>
</body></html>`;
const out = only ? `v8a-p${only}.html` : 'presskit-final.html';
fs.writeFileSync(path.join(__dirname, out), html);
console.log('written', out);
