import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import schema from './src/core/design/schema.json';
import { ADMIN_BRAND, DEFAULT_ACCENT, PLATFORM_BRAND } from './src/core/tokens.js';
import { FONT_FAMILIES, STYLE_KEYS } from './src/core/design/htmlAttrs.js';
import { ALL_NS, HOST_NS, hostNamespaces } from './src/locales/namespaces.js';

const HOSTS = ['store', 'platform', 'manager', 'admin'];

// The faces index.html preloads (src/styles/fonts.css): the two every page sets
// text in. Noto's Latin is preloaded by the page itself when the store's theme
// is Soft, the one theme that sets Latin in it.
const PRELOAD = ['geist-latin', 'noto-sans-georgian-georgian'];

// Chunks are found by the modules they hold: Rollup leaves facadeModuleId
// unset on a dynamic entry it has merged other modules into.
const holds = (c, file) => (c.moduleIds || Object.keys(c.modules || {})).some((m) => m.replace(/\\/g, '/').endsWith(file));
const dynamicChunks = (bundle) => Object.values(bundle || {}).filter((c) => c.type === 'chunk' && c.isDynamicEntry);

/** The built URL of each host's route table (src/router/<host>.jsx), its own chunk. */
function hostChunks(bundle, base) {
  const chunks = dynamicChunks(bundle);
  return Object.fromEntries(HOSTS.map((host) => {
    const chunk = chunks.find((c) => holds(c, `src/router/${host}.jsx`));
    return [host, chunk ? `${base}${chunk.fileName}` : null];
  }));
}

/**
 * The built URL of each language's strings (src/i18n.js): the shared chunk
 * and each host's own namespaces, and which of them each host loads.
 */
function localeChunks(bundle, base) {
  const chunks = dynamicChunks(bundle);
  const url = (file) => {
    const chunk = chunks.find((c) => holds(c, file));
    return chunk ? `${base}${chunk.fileName}` : null;
  };
  const own = [...new Set(Object.values(HOST_NS).flat())];
  return {
    files: Object.fromEntries(['en', 'ka'].map((lng) => [lng, {
      shared: url(`src/locales/shared.${lng}.js`),
      ...Object.fromEntries(own.map((ns) => [ns, url(`src/locales/${lng}/${ns}.json`)])),
    }])),
    hosts: Object.fromEntries(HOSTS.map((host) => [host, ['shared', ...HOST_NS[host]]])),
  };
}

// Which translation namespaces each host can reach, read from the build's own
// module graph: every module the host's route table imports, at once or
// lazily, and every module the app's entry imports, scanned for
// useTranslation('ns'), 'ns:key' and { ns: 'ns' }. Modules, not chunks: a
// chunk Rollup shares between hosts holds components a host never imports. A
// host that can reach a namespace src/locales/namespaces.js does not give it
// fails the build: the page would show that namespace's raw keys.
function checkNamespaces() {
  const names = ALL_NS.join('|');
  const use = /useTranslation\(\s*\[?([^)\]]*)\]?\s*\)/g;
  const prefixed = new RegExp(`[\x27"\x60](${names}):[a-zA-Z$]`, 'g');
  const option = new RegExp(`\\bns(?::\\s*|=)[\x27"](${names})[\x27"]`, 'g');
  const read = (code) => {
    const found = new Set();
    for (const m of code.matchAll(use)) {
      const list = [...m[1].matchAll(/['"]([a-z]+)['"]/g)].map((x) => x[1]);
      if (!list.length) found.add('navbar'); // i18n.js's defaultNS
      list.forEach((n) => found.add(n));
    }
    for (const m of code.matchAll(prefixed)) found.add(m[1]);
    for (const m of code.matchAll(option)) found.add(m[1]);
    return found;
  };
  return {
    name: 'esy-namespaces',
    apply: 'build',
    generateBundle(_, bundle) {
      const own = (id) => /[\\/]src[\\/].*\.jsx?$/.test(id) && !/[\\/]src[\\/]locales[\\/]/.test(id);
      const reach = (start, dynamic, skip = new Set()) => {
        const seen = new Set();
        const stack = [start];
        while (stack.length) {
          const id = stack.pop();
          if (seen.has(id)) continue;
          seen.add(id);
          const info = /node_modules/.test(id) ? null : this.getModuleInfo(id);
          if (!info) continue;
          info.importedIds.forEach((m) => stack.push(m));
          if (dynamic && !skip.has(id)) info.dynamicallyImportedIds.forEach((m) => stack.push(m));
        }
        return seen;
      };
      const scan = (ids) => {
        const found = new Set();
        for (const id of ids) {
          if (!own(id)) continue;
          let code;
          try { code = readFileSync(id, 'utf8'); } catch { continue; }
          read(code).forEach((n) => found.add(n));
        }
        return found;
      };
      // The entry's own imports are every host's; its dynamic imports are the
      // hosts themselves, each walked on its own.
      const entry = Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry);
      const shared = reach(entry.facadeModuleId, false);
      const problems = [];
      for (const host of HOSTS) {
        const table = [...this.getModuleIds()].find((id) => id.replace(/\\/g, '/').endsWith(`src/router/${host}.jsx`));
        if (!table) continue;
        const loads = new Set(hostNamespaces(host));
        const missing = [...scan(new Set([...shared, ...reach(table, true, shared)]))].filter((n) => !loads.has(n));
        if (missing.length) problems.push(`${host}: ${missing.join(', ')}`);
      }
      if (problems.length) {
        this.error(`Translation namespaces a host reads but does not load (add them to src/locales/namespaces.js): ${problems.join('; ')}`);
      }
    },
  };
}

/** The built URL of one of src/assets/fonts' faces, or null outside a build. */
function fontUrl(bundle, base, name) {
  const asset = Object.values(bundle || {}).find((a) => a.type === 'asset'
    && (a.originalFileNames || []).some((f) => f.replace(/\\/g, '/').endsWith(`src/assets/fonts/${name}.woff2`)));
  return asset ? `${base}${asset.fileName}` : null;
}

// The page's first frame (src/boot/paint.js), inlined into index.html where it
// says <!--esy:paint-->, with what it needs from the design schema and the
// brand colours — the same lists ThemeRoot and normalizeDesign read, so the
// first frame cannot draw an option the app would not — and the preloads for
// the app's own faces in front of it. It runs after the bundle is written, the
// only time the faces' built names are known.
function paintScript() {
  const file = fileURLToPath(new URL('./src/boot/paint.js', import.meta.url));
  let base = '/';
  return {
    name: 'esy-paint',
    configResolved(config) { base = config.base; },
    transformIndexHtml: { order: 'post', async handler(html, ctx) {
      const preloads = PRELOAD.map((name) => fontUrl(ctx.bundle, base, name)).filter(Boolean)
        .map((href) => `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`);
      const cfg = {
        themes: schema.options.theme,
        theme: schema.defaults.theme,
        keys: STYLE_KEYS,
        options: Object.fromEntries(STYLE_KEYS.map((k) => [k, schema.options[`style.${k}`]])),
        defaults: Object.fromEntries(STYLE_KEYS.map((k) => [k, schema.defaults.style[k]])),
        fonts: FONT_FAMILIES,
        accent: DEFAULT_ACCENT,
        platform: PLATFORM_BRAND,
        admin: ADMIN_BRAND,
        softLatin: fontUrl(ctx.bundle, base, 'noto-sans-georgian-latin'),
        hosts: hostChunks(ctx.bundle, base),
        locales: localeChunks(ctx.bundle, base),
      };
      // A plain script, not a module: its exports (TenantContext imports one) are plain declarations here.
      const source = readFileSync(file, 'utf8').replace(/^export (default )?/gm, '');
      const { code } = await transformWithEsbuild(`${source}\ntry { paint(${JSON.stringify(cfg)}); } catch (e) { /* index.html's defaults stand */ }`, file, {
        minify: true, format: 'iife', target: 'es2017',
      });
      return html.replace('<!--esy:paint-->', () => `${preloads.join('\n    ')}\n    <script>${code.trim()}</script>`);
    } },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), paintScript(), checkNamespaces()],
  server: {
    // NOTE: the Vite dev server is NOT the supported local flow — `docker
    // compose up` (see README) is. This block only matters if you start `vite`
    // by hand. It deliberately stays off 8092 so it can never collide with the
    // compose stack; the trade-off is that Google sign-in does not work here,
    // because http://localhost:5173/login/oauth2/code/google is not a
    // registered redirect URI. `vite build` ignores everything below.
    host: '0.0.0.0', // Allow all hosts (better for ngrok)
    port: 5173,
    strictPort: false,
    hmr: {
      port: 5173,
    },
    proxy: {
      // Forward backend calls so the browser stays same-origin in dev (no CORS)
      // and the whole OAuth round-trip happens on one host.
      //
      // changeOrigin MUST stay false everywhere below: TenantContextService
      // resolves the store from the Host header, and Spring builds the OAuth
      // redirect_uri from it too. Rewriting it to localhost:8080 would pin every
      // request to the default tenant and send Google an unregistered URI.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
      // The Google handshake: /oauth2/authorization/google starts it and
      // /login/oauth2/code/google receives the callback. Both must be proxied,
      // otherwise the SPA would have to jump to localhost:8080 mid-flow and the
      // session cookie would land on the wrong host.
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
      '/login': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      // *.lvh.me resolves to 127.0.0.1 via public DNS — the local stand-in for
      // *.esy.ge, so tenant subdomains work without touching /etc/hosts.
      'lvh.me',
      '.lvh.me',
      '3e62234f4728.ngrok-free.app',
      '.ngrok-free.app',
      '.ngrok.io',
    ],
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          i18n: ['react-i18next', 'i18next'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@mui/icons-material'],
  },
});
