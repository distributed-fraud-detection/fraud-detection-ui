import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL || 'http://localhost:8080'

  return {
    plugins: [react()],

    // Dev proxy — forwards /api/* to the Spring Cloud Gateway.
    // This avoids CORS issues when running `npm run dev` locally.
    server: {
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
          rewrite: (path) => path, // keep path as-is; gateway routes by prefix
        },
        '/actuator': {
          target: apiBase,
          changeOrigin: true,
        },
      },
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      css: false,
    },
  }
})
