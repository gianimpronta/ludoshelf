import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Testado nesta sessão: `environmentMatchGlobs` não separa nucleo (node) do resto
// (jsdom) dentro de um único config. Por isso este arquivo cobre só a UI —
// exclui `src/nucleo/**`, que tem seu próprio projeto em vitest.nucleo.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'app-ui',
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    exclude: ['**/node_modules/**', 'src/nucleo/**', 'tests/**'],
  },
})
