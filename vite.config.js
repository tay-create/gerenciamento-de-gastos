import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const chunkMap = {
  'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
  'charts-vendor':   ['recharts'],
  'supabase-vendor': ['@supabase/supabase-js'],
  'utils-vendor':    ['date-fns', 'html2canvas'],
};

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          for (const [chunk, pkgs] of Object.entries(chunkMap)) {
            if (pkgs.some(pkg => id.includes(`/node_modules/${pkg}/`))) {
              return chunk;
            }
          }
        },
      },
    },
  },
})
