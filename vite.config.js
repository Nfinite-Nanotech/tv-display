import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/quote': {
          target: 'https://api.api-ninjas.com',
          changeOrigin: true,
          rewrite: () => '/v1/quotes',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest) => {
              if (env.API_NINJAS_KEY) {
                proxyRequest.setHeader('X-Api-Key', env.API_NINJAS_KEY)
              }
            })
          },
        },
      },
    },
  }
})
