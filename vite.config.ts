import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['unhumanistic-maryann-stonefly.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:5151',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/design/**'],
    },
  },
})
