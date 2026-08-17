import { describe, expect, it } from 'vitest'
import { montarEstante } from './estante.js'

const definicaoBase = {
  nome: 'Billy da sala',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 350, 300],
}

describe('montarEstante', () => {
  it('cria um compartimento por altura livre informada', () => {
    expect(montarEstante('e1', definicaoBase).compartimentos).toHaveLength(3)
  })

  it('acumula a altura da base de baixo para cima somando prateleira e vao', () => {
    const bases = montarEstante('e1', definicaoBase).compartimentos.map((c) => c.alturaDaBaseMm)
    expect(bases).toEqual([80, 448, 816])
  })

  it('replica largura e profundidade em todos os compartimentos', () => {
    const primeiro = montarEstante('e1', definicaoBase).compartimentos[0]
    expect(primeiro?.larguraUtilMm).toBe(760)
    expect(primeiro?.profundidadeUtilMm).toBe(280)
  })

  it('gera identificadores estaveis e previsiveis', () => {
    const ids = montarEstante('e1', definicaoBase).compartimentos.map((c) => c.id)
    expect(ids).toEqual(['e1-p0', 'e1-p1', 'e1-p2'])
  })

  it('recusa estante sem prateleira nenhuma', () => {
    const vazia = { ...definicaoBase, alturasLivresMm: [] }
    expect(() => montarEstante('e1', vazia)).toThrow(/ao menos uma prateleira/)
  })
})
