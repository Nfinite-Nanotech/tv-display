import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/cat': {
        target: 'https://api.thecatapi.com',
        changeOrigin: true,
        rewrite: () => '/v1/images/search?mime_types=jpg,png',
      },
    },
  },
})
