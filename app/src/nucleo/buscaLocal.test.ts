import { describe, expect, it } from 'vitest'
import { montarContexto, PONTUACAO_ZERADA, type Arranjo } from './arranjo.js'
import { montarArranjoInicial } from './arranjoInicial.js'
import { melhorar } from './buscaLocal.js'
import { montarEstante } from './estante.js'
import { geradorMulberry32 } from './gerador.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'
import { pontuar, PESOS_PADRAO } from './pontuacao.js'

const manual = { tipo: 'manual' } as const

const jogo = (id: string, espessuraMm: number, idJogoBase: string | null = null): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, espessuraMm, manual, true),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 600,
  profundidadeUtilMm: 320,
  alturaDoRodapeMm: 100,
  espessuraDaPrateleiraMm: 20,
  alturasLivresMm: [350, 350, 350],
})

const usadoPorCompartimento = (arranjo: Arranjo, contexto: ReturnType<typeof montarContexto>) => {
  const usado = new Map<string, number>()
  for (const posicao of arranjo.posicoes) {
    const espessura = contexto.jogosPorId.get(posicao.idJogo)?.medidas.espessuraMm ?? 0
    usado.set(posicao.idCompartimento, (usado.get(posicao.idCompartimento) ?? 0) + espessura)
  }
  return usado
}

describe('melhorar', () => {
  it('nunca piora a pontuacao', () => {
    const jogos = [jogo('a', 120), jogo('b', 90), jogo('c', 150), jogo('d', 80), jogo('e', 200)]
    const contexto = montarContexto(jogos, estante)
    const inicial = montarArranjoInicial(jogos, contexto)
    const antes = pontuar(inicial, contexto, PESOS_PADRAO).total
    const depois = melhorar(inicial, contexto, PESOS_PADRAO, geradorMulberry32(1), 2000)
    expect(depois.pontuacao.total).toBeGreaterThanOrEqual(antes)
  })

  it('e repetivel com a mesma semente', () => {
    const jogos = [jogo('a', 120), jogo('b', 90), jogo('c', 150), jogo('d', 80)]
    const contexto = montarContexto(jogos, estante)
    const inicial = montarArranjoInicial(jogos, contexto)
    const um = melhorar(inicial, contexto, PESOS_PADRAO, geradorMulberry32(7), 1000)
    const dois = melhorar(inicial, contexto, PESOS_PADRAO, geradorMulberry32(7), 1000)
    expect(um.posicoes).toEqual(dois.posicoes)
  })

  it('preserva todos os jogos: nada some nem duplica', () => {
    const jogos = [jogo('a', 120), jogo('b', 90), jogo('c', 150), jogo('d', 80)]
    const contexto = montarContexto(jogos, estante)
    const resultado = melhorar(
      montarArranjoInicial(jogos, contexto),
      contexto,
      PESOS_PADRAO,
      geradorMulberry32(3),
      1000,
    )
    const vistos = [
      ...resultado.posicoes.map((p) => p.idJogo),
      ...resultado.naoAlocados.map((n) => n.idJogo),
    ]
    expect(vistos.sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('nunca estoura a largura de um compartimento', () => {
    const jogos = [jogo('a', 250), jogo('b', 250), jogo('c', 250), jogo('d', 250)]
    const contexto = montarContexto(jogos, estante)
    const resultado = melhorar(
      montarArranjoInicial(jogos, contexto),
      contexto,
      PESOS_PADRAO,
      geradorMulberry32(11),
      2000,
    )
    for (const total of usadoPorCompartimento(resultado, contexto).values()) {
      expect(total).toBeLessThanOrEqual(600)
    }
  })

  it('devolve o arranjo intacto quando nao ha iteracoes', () => {
    const jogos = [jogo('a', 120)]
    const contexto = montarContexto(jogos, estante)
    const inicial = montarArranjoInicial(jogos, contexto)
    const resultado = melhorar(inicial, contexto, PESOS_PADRAO, geradorMulberry32(1), 0)
    expect(resultado.posicoes).toEqual(inicial.posicoes)
  })

  it('aloca um jogo que ficou de fora quando ha lugar para ele', () => {
    // Dizer "nao coube" quando cabe e o pior erro que este motor pode cometer,
    // entao o movimento de alocar pendente e aceito mesmo sem melhorar a pontuacao.
    const jogos = [jogo('a', 200), jogo('b', 200), jogo('sobrou', 200)]
    const contexto = montarContexto(jogos, estante)
    const comPendente: Arranjo = {
      posicoes: [
        { idJogo: 'a', idCompartimento: 'e1-p0', deslocamentoXMm: 0, apoio: 'retrato' },
        { idJogo: 'b', idCompartimento: 'e1-p0', deslocamentoXMm: 200, apoio: 'retrato' },
      ],
      naoAlocados: [{ idJogo: 'sobrou', motivo: 'sem-espaco', faltaMm: 200 }],
      pontuacao: PONTUACAO_ZERADA,
    }
    const resultado = melhorar(comPendente, contexto, PESOS_PADRAO, geradorMulberry32(5), 500)
    expect(resultado.naoAlocados).toEqual([])
    expect(resultado.posicoes.map((p) => p.idJogo).sort()).toEqual(['a', 'b', 'sobrou'])
  })

  it('nao desaloca ninguem que ja estava posicionado', () => {
    const jogos = [jogo('a', 250), jogo('b', 250), jogo('c', 250)]
    const contexto = montarContexto(jogos, estante)
    const inicial = montarArranjoInicial(jogos, contexto)
    const resultado = melhorar(inicial, contexto, PESOS_PADRAO, geradorMulberry32(13), 2000)
    expect(resultado.posicoes).toHaveLength(inicial.posicoes.length)
  })

  // Cenario apertado o bastante para forcar pendentes, com uma familia e varios
  // jogos soltos, rodado por muitas iteracoes: e o que da chance real aos
  // movimentos moverFamilia e trocarComPendente de interagir com pendentes.
  it('nenhum jogo aparece em posicoes e em naoAlocados ao mesmo tempo, mesmo com familia e pendentes', () => {
    const apertada = montarEstante('apertada', {
      nome: 'Apertada',
      larguraUtilMm: 400,
      profundidadeUtilMm: 320,
      alturaDoRodapeMm: 100,
      espessuraDaPrateleiraMm: 20,
      alturasLivresMm: [350, 350],
    })
    const jogos = [
      jogo('base', 220),
      jogo('exp', 220, 'base'),
      jogo('solto1', 250),
      jogo('solto2', 250),
      jogo('solto3', 250),
    ]
    for (const semente of [1, 7, 42, 99, 20260817]) {
      const contexto = montarContexto(jogos, apertada)
      const inicial = montarArranjoInicial(jogos, contexto)
      const resultado = melhorar(inicial, contexto, PESOS_PADRAO, geradorMulberry32(semente), 20000)
      const posicionados = new Set(resultado.posicoes.map((p) => p.idJogo))
      const pendentes = new Set(resultado.naoAlocados.map((n) => n.idJogo))
      for (const idJogo of posicionados) {
        expect(pendentes.has(idJogo)).toBe(false)
      }
      expect(resultado.posicoes.length + resultado.naoAlocados.length).toBe(jogos.length)
    }
  })
})
