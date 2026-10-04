# Press kit (4-page A4 PDF)

Built from the live site content plus local assets, then printed to PDF with headless Edge. Local only (`scripts/` is never deployed).

1. `curl -s https://www.thecxalgorithm.com/api/content -o content.json`
2. `node build.js` → `presskit-final.html` (`node build.js 2` renders only page 2 for checking)
3. Print: `msedge --headless=new --no-pdf-header-footer --virtual-time-budget=25000 --print-to-pdf=CX-Algorithm-Press-Kit.pdf presskit-final.html`
4. Upload in admin → Host → press kit, then Save & publish.

Pages: 1 album-cover podcast artwork · 2 guests (B&W portraits + company logos, cropped via the CROPS table) · 3 host (HX Forum Sydney photo, bio, credentials, 15+ / 30+ / 4 continents / 40K+) · 4 speaking + contact.
Never include $688M funds growth or the 27% churn figure (confidential). Never write "weekly".
