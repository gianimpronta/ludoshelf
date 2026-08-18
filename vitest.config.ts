import { defineConfig } from 'vitest/config'

// Dois projetos dentro do mesmo pacote app: um para a UI (jsdom), um para o
// núcleo (node). Verificado nesta sessão — a alternativa de um único config
// com `environmentMatchGlobs` não funcionou.
export default defineConfig({
  test: {
    projects: ['app/vite.config.ts', 'app/vitest.nucleo.config.ts'],
  },
})
