import { describe, expect, it } from 'vitest'
import { criarMedidas, pesoDeFrequencia, PESO_DE_DESTAQUE } from './jogo.js'

describe('criarMedidas', () => {
  it('ordena os dois lados em maior e menor, independente da ordem recebida', () => {
    const medidas = criarMedidas(220, 300, 60, { tipo: 'manual' }, true)
    expect(medidas.maiorMm).toBe(300)
    expect(medidas.menorMm).toBe(220)
  })

  it('preserva a espessura, que nunca disputa com os outros lados', () => {
    const medidas = criarMedidas(295, 295, 72, { tipo: 'manual' }, true)
    expect(medidas.espessuraMm).toBe(72)
  })

  it('recusa medida inválida citando o campo', () => {
    expect(() => criarMedidas(295, 295, 0, { tipo: 'manual' }, true)).toThrow(/espessuraMm/)
  })
})

describe('pesoDeFrequencia', () => {
  it('trata desconhecida como zero', () => {
    expect(pesoDeFrequencia({ tipo: 'desconhecida' })).toBe(0)
  })

  it('usa a quantidade de partidas', () => {
    expect(pesoDeFrequencia({ tipo: 'partidas', quantidade: 12 })).toBe(12)
  })

  it('trata destaque como prioridade fixa, não como estatística', () => {
    expect(pesoDeFrequencia({ tipo: 'destaque', marcadoPeloUsuario: true })).toBe(PESO_DE_DESTAQUE)
  })
})
