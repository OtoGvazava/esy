import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
      '.ngrok.io'
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
})
