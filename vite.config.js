import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor':  ['recharts'],
          'supabase-vendor':['@supabase/supabase-js'],
          'utils-vendor':   ['date-fns', 'html2canvas'],
        },
      },
    },
  },
})
