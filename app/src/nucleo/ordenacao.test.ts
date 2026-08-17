import { describe, expect, it } from 'vitest'
import { montarContexto, PONTUACAO_ZERADA, type Arranjo } from './arranjo.js'
import { montarEstante } from './estante.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'
import { ordenarParaExibicao } from './ordenacao.js'

const manual = { tipo: 'manual' } as const

const jogo = (id: string, nome: string, idJogoBase: string | null = null): CaixaDeJogo => ({
  id,
  nome,
  medidas: criarMedidas(295, 220, 100, manual, true),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 1000,
  profundidadeUtilMm: 320,
  alturaDoRodapeMm: 100,
  espessuraDaPrateleiraMm: 20,
  alturasLivresMm: [350],
})

const arranjoCom = (ids: readonly string[]): Arranjo => ({
  posicoes: ids.map((idJogo, indice) => ({
    idJogo,
    idCompartimento: 'e1-p0',
    deslocamentoXMm: indice * 100,
    apoio: 'retrato' as const,
  })),
  naoAlocados: [],
  pontuacao: PONTUACAO_ZERADA,
})

describe('ordenarParaExibicao', () => {
  it('ordena alfabeticamente por nome normalizado', () => {
    const jogos = [jogo('z', 'Zombicide'), jogo('a', 'Ávila'), jogo('m', 'Marco Polo')]
    const ctx = montarContexto(jogos, estante)
    const ordenado = ordenarParaExibicao(arranjoCom(['z', 'm', 'a']), ctx)
    expect(ordenado.posicoes.map((p) => p.idJogo)).toEqual(['a', 'm', 'z'])
  })

  it('poe a expansao logo depois do seu jogo-base', () => {
    const jogos = [
      jogo('base', 'Catan'),
      jogo('exp', 'Catan: Navegadores', 'base'),
      jogo('outro', 'Carcassonne'),
    ]
    const ctx = montarContexto(jogos, estante)
    const ordenado = ordenarParaExibicao(arranjoCom(['exp', 'outro', 'base']), ctx)
    expect(ordenado.posicoes.map((p) => p.idJogo)).toEqual(['outro', 'base', 'exp'])
  })

  it('recalcula os deslocamentos sem deixar buraco', () => {
    const jogos = [jogo('a', 'Azul'), jogo('b', 'Brass')]
    const ctx = montarContexto(jogos, estante)
    const ordenado = ordenarParaExibicao(arranjoCom(['b', 'a']), ctx)
    expect(ordenado.posicoes.map((p) => p.deslocamentoXMm)).toEqual([0, 100])
  })

  it('preserva os nao alocados e a pontuacao', () => {
    const jogos = [jogo('a', 'Azul')]
    const ctx = montarContexto(jogos, estante)
    const entrada: Arranjo = {
      ...arranjoCom(['a']),
      naoAlocados: [{ idJogo: 'x', motivo: 'alto-demais', faltaMm: 30 }],
    }
    expect(ordenarParaExibicao(entrada, ctx).naoAlocados).toEqual(entrada.naoAlocados)
  })

  it('nao move jogo entre compartimentos', () => {
    const jogos = [jogo('a', 'Azul'), jogo('b', 'Brass')]
    const ctx = montarContexto(jogos, estante)
    const entrada = arranjoCom(['b', 'a'])
    const ordenado = ordenarParaExibicao(entrada, ctx)
    for (const posicao of ordenado.posicoes) {
      expect(posicao.idCompartimento).toBe('e1-p0')
    }
  })
})
