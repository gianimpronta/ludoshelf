import { describe, expect, it } from 'vitest'
import { agruparFamilias } from './familias.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'

const jogo = (id: string, nome: string, idJogoBase: string | null): CaixaDeJogo => ({
  id,
  nome,
  medidas: criarMedidas(295, 295, 70, { tipo: 'manual' }, true),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

describe('agruparFamilias', () => {
  it('agrupa o base com suas expansoes', () => {
    const familias = agruparFamilias([
      jogo('a', 'Catan', null),
      jogo('b', 'Catan: Navegadores', 'a'),
      jogo('c', 'Catan: Cidades', 'a'),
    ])
    expect(familias).toEqual([{ idBase: 'a', membros: ['a', 'b', 'c'] }])
  })

  it('poe o base na primeira posicao', () => {
    const familias = agruparFamilias([
      jogo('b', 'Catan: Navegadores', 'a'),
      jogo('a', 'Catan', null),
    ])
    expect(familias[0]?.membros[0]).toBe('a')
  })

  it('ignora jogo solto, que nao forma familia', () => {
    expect(agruparFamilias([jogo('a', 'Azul', null)])).toEqual([])
  })

  it('ignora expansao cujo base nao esta na colecao', () => {
    expect(agruparFamilias([jogo('b', 'Expansao orfa', 'inexistente')])).toEqual([])
  })

  // Dados sujos vindos de importacao: sem estas guardas o agrupamento sai errado
  // em silencio — nada lanca, nenhum teste fica vermelho, so a pontuacao fica torta.
  it('ignora jogo que aponta para si mesmo', () => {
    expect(agruparFamilias([jogo('a', 'Auto-referente', 'a')])).toEqual([])
  })

  it('nao cria familias sobrepostas quando dois jogos se apontam mutuamente', () => {
    const familias = agruparFamilias([jogo('a', 'Um', 'b'), jogo('b', 'Outro', 'a')])
    expect(familias).toEqual([])
  })
})
