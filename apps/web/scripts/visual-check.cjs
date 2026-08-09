// Screenshot the running app beside the Claude Design project's own screens.
//
// The design project is a Babel-in-browser harness: each surface file
// (s-store.jsx, s-manager.jsx, …) defines screen components, and the .html
// pages arrange them on a pan/zoom canvas. Comparing against those pages
// directly would capture canvas furniture, so this expects a minimal harness
// that renders ONE screen full-bleed at the viewport we set:
//
//   <dir>/one.html?screen=SHome&size=web[&dark=1&lang=en&store=qvevri]
//
// with esy-core.jsx + the surface files beside it, served over http (Babel
// will not fetch file:// scripts). Point DESIGN at that server.
//
//   node scripts/visual-check.cjs            # capture both sides
//
// Auth-gated surfaces (manager, admin, account) cannot be captured without a
// real Google sign-in, so they are absent by design rather than by oversight.
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const DESIGN = process.env.DESIGN_URL || 'http://127.0.0.1:4173/one.html';
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', '.shots');

// A store subdomain that actually has products — an empty store makes every
// grid look like a mismatch.
const STORE = process.env.STORE_URL || 'http://fashion.lvh.me:8092';

const PAIRS = [
  { name: 'store-home',     design: 'screen=SHome&size=web',            app: `${STORE}/`,           w: 1440, h: 1100 },
  { name: 'store-home-mob', design: 'screen=SHome&size=mob',            app: `${STORE}/`,           w: 390,  h: 900 },
  { name: 'store-product',  design: 'screen=SProduct&size=web',         app: `${STORE}/product/5`,  w: 1440, h: 1000 },
  { name: 'store-cart',     design: 'screen=SCart&size=web&state=empty', app: `${STORE}/cart`,      w: 1440, h: 700 },
  { name: 'store-about',    design: 'screen=SAbout&size=web',           app: `${STORE}/about`,      w: 1440, h: 1000 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const p of PAIRS) {
    for (const side of ['design', 'app']) {
      const page = await browser.newPage({ viewport: { width: p.w, height: p.h } });
      const url = side === 'design' ? `${DESIGN}?${p.design}` : p.app;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        // Babel compiles the design sources in-page; the app hydrates and
        // fetches. Neither is finished at networkidle.
        await page.waitForTimeout(2200);
        await page.screenshot({ path: path.join(OUT, `${p.name}.${side}.png`) });
        console.log(`ok   ${p.name}.${side}`);
      } catch (e) {
        console.log(`FAIL ${p.name}.${side}: ${e.message.slice(0, 90)}`);
      }
      await page.close();
    }
  }
  await browser.close();
  console.log(`\nshots in ${OUT}`);
})();
