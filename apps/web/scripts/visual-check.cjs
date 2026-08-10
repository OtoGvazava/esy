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
// will not fetch file:// scripts). Point DESIGN_URL at that server.
//
// Gated surfaces (manager, admin) are reached with a minted session cookie —
// see auth-cookie.cjs for why that is sound — plus the account created by
// seed-visual.sql. No real Google sign-in, and no production change.
//
//   docker compose exec -T db psql -U esy -d esy < apps/web/scripts/seed-visual.sql
//   JWT_SECRET=<the stack's secret> npm run visual:check
//
// A pair with `design: null` is captured app-side only, because that design
// source is not on disk yet — visibly one-sided rather than silently skipped.
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { authCookie } = require('./auth-cookie.cjs');

const DESIGN = process.env.DESIGN_URL || 'http://127.0.0.1:4173/one.html';
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', '.shots');

// A store subdomain that actually has products — an empty store makes every
// grid look like a mismatch.
const STORE = process.env.STORE_URL || 'http://fashion.lvh.me:8092';
const MGR = process.env.MANAGER_URL || 'http://manager.lvh.me:8092';
const ADM = process.env.ADMIN_URL || 'http://admin.lvh.me:8092';
const USER = process.env.VISUAL_USER || 'visual-check@esy.test';
const Q = '?tenant=fashion';

const PAIRS = [
  // Public storefront
  { name: 'store-home', design: 'screen=SHome&size=web', app: `${STORE}/`, w: 1440, h: 1100 },
  { name: 'store-home-mob', design: 'screen=SHome&size=mob', app: `${STORE}/`, w: 390, h: 900 },
  { name: 'store-product', design: 'screen=SProduct&size=web', app: `${STORE}/product/5`, w: 1440, h: 1000 },
  { name: 'store-cart', design: 'screen=SCart&size=web&state=empty', app: `${STORE}/cart`, w: 1440, h: 700 },
  { name: 'store-about', design: 'screen=SAbout&size=web', app: `${STORE}/about`, w: 1440, h: 1000 },

  // Back office — needs the session cookie
  { name: 'mgr-overview', design: 'screen=MOverview&size=web', app: `${MGR}/${Q}`, w: 1440, h: 1000, auth: true },
  { name: 'mgr-products', design: 'screen=MProducts&size=web', app: `${MGR}/products${Q}`, w: 1440, h: 1000, auth: true },
  { name: 'mgr-orders', design: 'screen=MOrders&size=web', app: `${MGR}/orders${Q}`, w: 1440, h: 1000, auth: true },
  { name: 'mgr-team', design: 'screen=MTeam&size=web', app: `${MGR}/team${Q}`, w: 1440, h: 900, auth: true },
  { name: 'mgr-money', design: 'screen=MMoney&size=web', app: `${MGR}/money${Q}`, w: 1440, h: 900, auth: true },
  { name: 'mgr-settings', design: 'screen=MSettings&size=web', app: `${MGR}/settings/shop${Q}`, w: 1440, h: 1100, auth: true },

  // Platform admin — design sources not on disk yet.
  { name: 'adm-stores', design: null, app: `${ADM}/stores`, w: 1440, h: 1000, auth: true },
  { name: 'adm-billing', design: null, app: `${ADM}/billing`, w: 1440, h: 900, auth: true },
  { name: 'adm-admins', design: null, app: `${ADM}/admins`, w: 1440, h: 900, auth: true },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const p of PAIRS) {
    for (const side of ['design', 'app']) {
      if (side === 'design' && !p.design) continue;
      const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h } });
      // Only the app side needs a session; the design harness has no server.
      if (side === 'app' && p.auth) await ctx.addCookies([authCookie(USER)]);
      const page = await ctx.newPage();
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
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\nshots in ${OUT}`);
})();
