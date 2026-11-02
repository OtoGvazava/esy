// The page's first frame, drawn before any of the app has loaded.
//
// vite.config.js inlines this into index.html's <head> as a plain script, with
// the design schema's option lists and the brand colours as `cfg`. It runs
// before the stylesheet paints anything, so the theme tokens on <html> are
// already the right ones when the first frame is drawn:
//
//  - light or dark, from the same stored choice useAppTheme reads;
//  - on a store, its theme, colour, style options and type, from the store the
//    server put into the page (SpaIndex.java: { tenant } as JSON in #esy-boot,
//    tenant being the /api/tenant/current body), and the shopper's display
//    settings from this browser, as DisplayPrefsContext keeps them;
//  - elsewhere, esy's theme in the host's colour;
//  - the host's own chunk of the app (its route table) starts loading beside
//    the app's entry, rather than once the entry has run;
//  - the store's own faces start loading at once (a design's from Google
//    Fonts; esy's own are preloaded by index.html), and its name is the title.
//
// ThemeRoot (App.jsx) and DisplayPrefsContext take over on mount and draw the
// same attributes from the same data, so nothing changes when the app starts.
// Every step is guarded: a failure leaves index.html's defaults, which is
// what the page looked like before this existed.
export default function paint(cfg) {
  const html = document.documentElement;
  const stored = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const matches = (query) => {
    try { return matchMedia(query).matches; } catch { return false; }
  };
  const pick = (value, list, fallback) => (list.indexOf(value) >= 0 ? value : fallback);

  let mode = stored('theme-mode');
  if (mode !== 'light' && mode !== 'dark') mode = matches('(prefers-color-scheme: dark)') ? 'dark' : 'light';
  html.setAttribute('data-md', mode);
  const lang = stored('lang');
  if (lang === 'ka' || lang === 'en') html.setAttribute('lang', lang);

  let tenant = null;
  try {
    const el = document.getElementById('esy-boot');
    tenant = el ? JSON.parse(el.textContent).tenant || null : null;
  } catch {
    tenant = null;
  }

  // The same split as hooks/usePlatformHost.js and ThemeRoot.
  const host = location.hostname.toLowerCase();
  const params = new URLSearchParams(location.search);
  const admin = params.has('admin') || host.indexOf('admin.') === 0;
  const manager = !admin && (params.has('manager') || host.indexOf('manager.') === 0);
  const store = !admin && !manager && !!tenant && tenant.isPlatform === false;
  const closed = store && !!tenant.suspended;
  const live = store && !closed;

  // safeAccent in core/tokens.js.
  const accent = (value) => {
    const v = typeof value === 'string' ? value.trim() : '';
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    return cfg.accent;
  };
  const brand = admin ? cfg.admin : (!store && !manager) || closed ? cfg.platform : accent(tenant && tenant.primaryColor);
  html.style.setProperty('--k-brand', brand);

  const design = live && tenant.design && typeof tenant.design === 'object' ? tenant.design : {};
  const style = design.style && typeof design.style === 'object' ? design.style : {};
  const theme = live ? pick(design.theme, cfg.themes, cfg.theme) : 'esy';
  html.setAttribute('data-th', theme);
  let font = 'theme';
  if (live) {
    cfg.keys.forEach((k) => {
      const v = pick(style[k], cfg.options[k], cfg.defaults[k]);
      if (k === 'font') font = v;
      if (v !== 'theme') html.setAttribute(`data-${k}`, v);
    });
  }

  // The store's own faces, loading from now rather than once the app runs.
  const add = (attrs) => {
    const link = document.createElement('link');
    Object.keys(attrs).forEach((k) => { link.setAttribute(k, attrs[k]); });
    document.head.appendChild(link);
  };
  // This host's part of the app (router/index.jsx loads one table per host).
  const chunk = cfg.hosts && cfg.hosts[admin ? 'admin' : manager ? 'manager' : store ? 'store' : 'platform'];
  if (chunk) add({ rel: 'modulepreload', href: chunk, crossorigin: '' });
  // Soft sets Latin in Noto Sans Georgian too, not only Georgian.
  if (theme === 'soft' && cfg.softLatin) add({ rel: 'preload', href: cfg.softLatin, as: 'font', type: 'font/woff2', crossorigin: '' });
  const families = [...new Set([...(cfg.fonts[font] || []), ...(theme === 'neon' ? cfg.fonts.neon : [])])];
  if (families.length) {
    add({ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' });
    add({
      id: 'esy-design-fonts',
      rel: 'stylesheet',
      href: `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`,
    });
  }

  // The shopper's display settings, on every storefront (prefs.js keeps them
  // under esy-display; an unset switch follows the device).
  if (store) {
    let prefs = {};
    try { prefs = JSON.parse(stored('esy-display') || '{}') || {}; } catch { prefs = {}; }
    const own = (key, device) => (typeof prefs[key] === 'boolean' ? prefs[key] : device);
    let saveData = false;
    try { saveData = !!navigator.connection.saveData; } catch { saveData = false; }
    html.setAttribute('data-text', pick(prefs.text, ['s', 'm', 'l', 'xl'], 'm'));
    if (own('solid', matches('(prefers-reduced-transparency: reduce)'))) html.setAttribute('data-solid', '');
    if (own('motion', matches('(prefers-reduced-motion: reduce)'))) html.setAttribute('data-motion', 'reduce');
    if (own('saver', saveData || matches('(prefers-reduced-data: reduce)'))) html.setAttribute('data-saver', '');
  }

  const title = tenant && (tenant.displayName || tenant.name);
  if (title) document.title = title;
}
