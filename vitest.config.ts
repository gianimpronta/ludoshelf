import { defineConfig } from 'vitest/config'

// `projects` substituiu `workspace`, deprecado no Vitest 3.2. Com um pacote só
// isso parece exagero, mas o pacote `proxy` entra no plano 4 e a raiz já fica pronta.
export default defineConfig({
  test: {
    projects: ['app'],
  },
})
