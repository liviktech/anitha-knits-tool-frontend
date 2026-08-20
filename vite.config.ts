import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The deployed backend doesn't send CORS headers, so a direct browser fetch
// to its full URL is blocked. In dev, api-client.ts issues same-origin
// relative requests instead and this proxy forwards them server-to-server
// (no CORS involved there) — target is derived from VITE_API_BASE_URL so
// .env stays the single place the backend URL is configured.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = env.VITE_API_BASE_URL ? new URL(env.VITE_API_BASE_URL).origin : 'http://localhost:4000'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
        },
      },
    },
  }
})