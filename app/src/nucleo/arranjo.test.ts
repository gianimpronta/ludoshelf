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
    const contexto = montarContexto([jogo('a', null)], estante)
    expect(contexto.jogosPorId.get('a')?.id).toBe('a')
  })

  it('indexa os compartimentos por id', () => {
    const contexto = montarContexto([], estante)
    expect([...contexto.compartimentosPorId.keys()]).toEqual(['e1-p0', 'e1-p1'])
  })

  it('calcula as familias uma unica vez', () => {
    const contexto = montarContexto([jogo('a', null), jogo('b', 'a')], estante)
    expect(contexto.familias).toEqual([{ idBase: 'a', membros: ['a', 'b'] }])
  })

  // Sem esta recusa, new Map mantem so a ultima entrada de um id repetido, e
  // consultas futuras passariam a usar as medidas e a frequencia de um jogo
  // diferente sob o mesmo id, em silencio.
  it('recusa id de jogo duplicado', () => {
    expect(() => montarContexto([jogo('a', null), jogo('a', null)], estante)).toThrow(
      /id de jogo duplicado.*recebido: "a"/,
    )
  })
})

describe('exigirJogo e exigirCompartimento', () => {
  it('falham alto citando o id ausente, porque isso e defeito de programacao', () => {
    const contexto = montarContexto([jogo('a', null)], estante)
    expect(() => exigirJogo(contexto, 'fantasma')).toThrow(/recebido id: "fantasma"/)
    expect(() => exigirCompartimento(contexto, 'e9-p9')).toThrow(/recebido id: "e9-p9"/)
  })
})
