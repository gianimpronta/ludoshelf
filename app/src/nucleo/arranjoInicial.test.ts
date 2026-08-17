import { describe, expect, it } from 'vitest'
import { montarContexto } from './arranjo.js'
import { montarArranjoInicial } from './arranjoInicial.js'
import { montarEstante } from './estante.js'
import { criarMedidas, type CaixaDeJogo, type MedidasDaCaixa } from './jogo.js'

const manual = { tipo: 'manual' } as const

const jogo = (
  id: string,
  medidas: MedidasDaCaixa,
  idJogoBase: string | null = null,
): CaixaDeJogo => ({
  id,
  nome: id,
  medidas,
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estanteDe = (larguraUtilMm: number, alturasLivresMm: number[], profundidadeUtilMm = 320) =>
  montarEstante('e1', {
    nome: 'Billy',
    larguraUtilMm,
    profundidadeUtilMm,
    alturaDoRodapeMm: 100,
    espessuraDaPrateleiraMm: 20,
    alturasLivresMm,
  })

describe('montarArranjoInicial', () => {
  it('aloca todos os jogos quando ha espaco de sobra', () => {
    const jogos = [
      jogo('a', criarMedidas(295, 220, 70, manual, true)),
      jogo('b', criarMedidas(295, 220, 60, manual, true)),
    ]
    const estante = estanteDe(760, [350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    expect(arranjo.posicoes).toHaveLength(2)
    expect(arranjo.naoAlocados).toEqual([])
  })

  it('nao estoura a largura do compartimento', () => {
    const jogos = [
      jogo('a', criarMedidas(295, 220, 200, manual, true)),
      jogo('b', criarMedidas(295, 220, 200, manual, true)),
      jogo('c', criarMedidas(295, 220, 200, manual, true)),
    ]
    const estante = estanteDe(500, [350, 350])
    const contexto = montarContexto(jogos, estante)
    const arranjo = montarArranjoInicial(jogos, contexto)
    const porCompartimento = new Map<string, number>()
    for (const posicao of arranjo.posicoes) {
      const espessura = contexto.jogosPorId.get(posicao.idJogo)?.medidas.espessuraMm ?? 0
      const usado = (porCompartimento.get(posicao.idCompartimento) ?? 0) + espessura
      porCompartimento.set(posicao.idCompartimento, usado)
      expect(usado).toBeLessThanOrEqual(500)
    }
  })

  it('mantem a familia junta quando ela cabe inteira', () => {
    const jogos = [
      jogo('base', criarMedidas(295, 220, 70, manual, true)),
      jogo('exp', criarMedidas(295, 220, 40, manual, true), 'base'),
      jogo('outro', criarMedidas(295, 220, 300, manual, true)),
    ]
    const estante = estanteDe(400, [350, 350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    const de = (id: string) => arranjo.posicoes.find((p) => p.idJogo === id)?.idCompartimento
    expect(de('base')).toBe(de('exp'))
  })

  it('recusa por altura o jogo mais alto que qualquer prateleira', () => {
    const jogos = [jogo('gigante', criarMedidas(400, 380, 80, manual, true))]
    const estante = estanteDe(760, [300])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    expect(arranjo.naoAlocados).toEqual([{ idJogo: 'gigante', motivo: 'alto-demais', faltaMm: 80 }])
  })

  it('marca sem-espaco quando o jogo caberia mas nao sobrou largura', () => {
    const jogos = [
      jogo('a', criarMedidas(295, 220, 300, manual, true)),
      jogo('b', criarMedidas(295, 220, 300, manual, true)),
    ]
    const estante = estanteDe(400, [350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    expect(arranjo.naoAlocados).toEqual([{ idJogo: 'b', motivo: 'sem-espaco', faltaMm: 200 }])
  })

  it('atribui deslocamentos crescentes sem sobreposicao', () => {
    const jogos = [
      jogo('a', criarMedidas(295, 220, 100, manual, true)),
      jogo('b', criarMedidas(295, 220, 80, manual, true)),
    ]
    const estante = estanteDe(760, [350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    const deslocamentos = arranjo.posicoes.map((p) => p.deslocamentoXMm).sort((x, y) => x - y)
    expect(deslocamentos).toEqual([0, 100])
  })

  it('quebra a familia quando ela nao cabe inteira em lugar nenhum', () => {
    const jogos = [
      jogo('base', criarMedidas(295, 220, 300, manual, true)),
      jogo('exp', criarMedidas(295, 220, 300, manual, true), 'base'),
    ]
    const estante = estanteDe(400, [350, 350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    const de = (id: string) => arranjo.posicoes.find((p) => p.idJogo === id)?.idCompartimento
    expect(arranjo.naoAlocados).toEqual([])
    expect(de('base')).not.toBe(de('exp'))
  })
})
