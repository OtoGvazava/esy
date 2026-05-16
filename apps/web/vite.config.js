import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow all hosts (better for ngrok)
    port: 5173,
    strictPort: false,
    hmr: {
      port: 5173,
    },
    proxy: {
      // Forward API calls to the Spring Boot backend so the browser stays
      // same-origin in dev (no CORS) and the backend resolves the "main" tenant.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
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
        changeOrigin: true,
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
