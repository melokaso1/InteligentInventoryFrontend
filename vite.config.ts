import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { ProxyOptions } from 'vite'

function createApiProxy(): ProxyOptions {
  return {
    target: 'http://127.0.0.1:5151',
    changeOrigin: true,
    secure: false,
    configure: (proxy) => {
      proxy.on('error', (err) => {
        if ('code' in err && err.code === 'ECONNREFUSED') {
          console.error(
            '\n[Vite proxy] API .NET no detectada en :5151 — ejecuta: cd Backend/Api && dotnet run\n',
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': createApiProxy(),
    },
    watch: {
      ignored: ['**/design/**'],
    },
  },
})
