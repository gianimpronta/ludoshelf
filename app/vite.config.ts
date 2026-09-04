import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Testado nesta sessão: `environmentMatchGlobs` não separa nucleo (node) do resto
// (jsdom) dentro de um único config. Por isso este arquivo cobre só a UI —
// exclui `src/nucleo/**`, que tem seu próprio projeto em vitest.nucleo.config.ts.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
      },
    },
  },
  test: {
    name: 'app-ui',
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    testTimeout: 15000,
    exclude: ['**/node_modules/**', 'src/nucleo/**', 'tests/**'],
  },
})
