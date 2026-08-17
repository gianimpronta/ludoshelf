import { describe, expect, it } from 'vitest'
import { exigirCompartimento, exigirJogo, montarContexto } from './arranjo.js'
import { montarEstante } from './estante.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 350],
})

const jogo = (id: string, idJogoBase: string | null): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

describe('montarContexto', () => {
  it('indexa os jogos por id', () => {
    const ctx = montarContexto([jogo('a', null)], estante)
    expect(ctx.jogosPorId.get('a')?.id).toBe('a')
  })

  it('indexa os compartimentos por id', () => {
    const ctx = montarContexto([], estante)
    expect([...ctx.compartimentosPorId.keys()]).toEqual(['e1-p0', 'e1-p1'])
  })

  it('calcula as familias uma unica vez', () => {
    const ctx = montarContexto([jogo('a', null), jogo('b', 'a')], estante)
    expect(ctx.familias).toEqual([{ idBase: 'a', membros: ['a', 'b'] }])
  })
})

describe('exigirJogo e exigirCompartimento', () => {
  it('falham alto citando o id ausente, porque isso e defeito de programacao', () => {
    const ctx = montarContexto([jogo('a', null)], estante)
    expect(() => exigirJogo(ctx, 'fantasma')).toThrow(/recebido id: "fantasma"/)
    expect(() => exigirCompartimento(ctx, 'e9-p9')).toThrow(/recebido id: "e9-p9"/)
  })
})
