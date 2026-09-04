import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CatalogoHttp } from './CatalogoHttp.js'
import { CatalogoFalso } from './CatalogoFalso.js'
import type { Milimetros } from '../nucleo/medidas.js'

describe('CatalogoHttp', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('usa fallback quando a requisição HTTP falha', async () => {
    const fallback = new CatalogoFalso()
    fallback.definirMedida('Azul', {
      maiorMm: 260 as Milimetros,
      menorMm: 260 as Milimetros,
      espessuraMm: 70 as Milimetros,
      chaveDoTemplate: 'azul',
      fonte: 'teste',
    })

    const catalogo = new CatalogoHttp('/api', fallback)
    // Simula falha de rede
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const resultado = await catalogo.buscar({ nome: 'Azul' })
    expect(resultado).not.toBeNull()
    expect(resultado?.maiorMm).toBe(260)
  })

  it('retorna versoes e dados do backend quando HTTP 200', async () => {
    const fallback = new CatalogoFalso()
    const catalogo = new CatalogoHttp('/api', fallback)

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jogos: [
          {
            id: 'catan-1',
            nome: 'Catan',
            idBgg: 13,
            versoes: [
              {
                id: 'v1',
                nomeVersao: 'Edição Galápagos',
                maiorMm: 295,
                menorMm: 240,
                espessuraMm: 75,
                fonte: 'catalogo-central',
              },
            ],
          },
        ],
      }),
    } as Response)

    const resultado = await catalogo.buscar({ idBgg: 13 })
    expect(resultado).not.toBeNull()
    expect(resultado?.maiorMm).toBe(295)
    expect(resultado?.versoes).toHaveLength(1)
    expect(resultado?.versoes?.[0]?.nomeVersao).toBe('Edição Galápagos')
  })
})
