import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // sockjs-client (used for the WebSocket fallback) expects Node's `global`,
  // which doesn't exist in the browser — map it to `globalThis`.
  define: {
    global: 'globalThis',
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@stomp') || id.includes('sockjs-client')) return 'ws';
          if (id.includes('@tanstack') || id.includes('axios') || id.includes('zustand')) return 'query';
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor';
          return 'vendor-misc';
        },
      },
    },
  },
})
