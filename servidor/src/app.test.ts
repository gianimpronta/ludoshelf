import { describe, expect, it } from 'vitest'
import { criarApp } from './app.js'
import type { ServicoCatalogo } from './servicos/servicoCatalogo.js'

describe('API Hono - LudoShelf', () => {
  it('responde 200 no endpoint /health', async () => {
    const app = criarApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.status).toBe('ok')
    expect(json.postgres).toBe(true)
  })

  it('busca jogos semeados por nome via /api/jogos/buscar?q=catan', async () => {
    const app = criarApp()
    const res = await app.request('/api/jogos/buscar?q=catan')
    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.jogos).toBeDefined()
    expect(json.jogos.length).toBeGreaterThan(0)
    const catan = json.jogos[0]
    expect(catan.nome).toBe('Catan')
    expect(catan.idBgg).toBe(13)
    expect(catan.versoes.length).toBeGreaterThan(0)
    expect(catan.versoes[0].maiorMm).toBe(295)
    expect(catan.versoes[0].menorMm).toBe(240)
    expect(catan.versoes[0].espessuraMm).toBe(75)
  })

  it('busca jogos por idBgg via /api/jogos/buscar?idBgg=230802', async () => {
    const app = criarApp()
    const res = await app.request('/api/jogos/buscar?idBgg=230802')
    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.jogos.length).toBe(1)
    expect(json.jogos[0].nome).toBe('Azul')
  })

  it('resolve lote de jogos via POST /api/jogos/resolver-lote', async () => {
    const app = criarApp()
    const res = await app.request('/api/jogos/resolver-lote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itens: [
          { linha: 1, nome: 'Catan', idBgg: 13 },
          { linha: 2, nome: 'Jogo Inexistente 999999' },
        ],
      }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.resultados).toHaveLength(2)
    expect(json.resultados[0].resultado?.nome).toBe('Catan')
    expect(json.resultados[1].resultado).toBeNull()
  })
})
