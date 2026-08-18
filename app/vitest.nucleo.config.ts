import { defineConfig } from 'vitest/config'

// O núcleo é TypeScript puro; roda em node, sem o custo de montar jsdom.
// `tests/**` inclui os testes de infraestrutura do núcleo (fronteira, regressão,
// escala) que já existiam antes deste plano — também não têm nada a ver com DOM.
export default defineConfig({
  test: {
    name: 'nucleo',
    environment: 'node',
    include: ['src/nucleo/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
