import { describe, expect, it } from 'vitest'
import { montarEstante } from '../src/nucleo/estante.js'
import { geradorMulberry32 } from '../src/nucleo/gerador.js'
import { criarMedidas, type CaixaDeJogo } from '../src/nucleo/jogo.js'
import { arranjar } from '../src/nucleo/motor.js'
import { PESOS_PADRAO } from '../src/nucleo/pontuacao.js'

const manual = { tipo: 'manual' } as const

interface LinhaDaColecao {
  readonly id: string
  readonly nome: string
  readonly idJogoBase: string | null
  readonly maiorMm: number
  readonly menorMm: number
  readonly espessuraMm: number
  readonly partidas: number
}

/** Coleção fixa: 12 jogos, duas famílias, medidas realistas em milímetros. */
const LINHAS: readonly LinhaDaColecao[] = [
  {
    id: 'catan',
    nome: 'Catan',
    idJogoBase: null,
    maiorMm: 295,
    menorMm: 295,
    espessuraMm: 70,
    partidas: 12,
  },
  {
    id: 'catan-nav',
    nome: 'Catan: Navegadores',
    idJogoBase: 'catan',
    maiorMm: 295,
    menorMm: 295,
    espessuraMm: 45,
    partidas: 4,
  },
  {
    id: 'catan-cid',
    nome: 'Catan: Cidades e Cavaleiros',
    idJogoBase: 'catan',
    maiorMm: 295,
    menorMm: 295,
    espessuraMm: 45,
    partidas: 2,
  },
  {
    id: 'azul',
    nome: 'Azul',
    idJogoBase: null,
    maiorMm: 295,
    menorMm: 295,
    espessuraMm: 72,
    partidas: 30,
  },
  {
    id: 'brass',
    nome: 'Brass: Birmingham',
    idJogoBase: null,
    maiorMm: 300,
    menorMm: 300,
    espessuraMm: 76,
    partidas: 8,
  },
  {
    id: 'wingspan',
    nome: 'Wingspan',
    idJogoBase: null,
    maiorMm: 295,
    menorMm: 240,
    espessuraMm: 70,
    partidas: 18,
  },
  {
    id: 'wingspan-eur',
    nome: 'Wingspan: Europa',
    idJogoBase: 'wingspan',
    maiorMm: 240,
    menorMm: 160,
    espessuraMm: 40,
    partidas: 6,
  },
  {
    id: 'marco',
    nome: 'Marco Polo',
    idJogoBase: null,
    maiorMm: 295,
    menorMm: 220,
    espessuraMm: 70,
    partidas: 3,
  },
  {
    id: 'carcassonne',
    nome: 'Carcassonne',
    idJogoBase: null,
    maiorMm: 300,
    menorMm: 220,
    espessuraMm: 60,
    partidas: 22,
  },
  {
    id: 'ticket',
    nome: 'Ticket to Ride',
    idJogoBase: null,
    maiorMm: 300,
    menorMm: 300,
    espessuraMm: 60,
    partidas: 15,
  },
  {
    id: 'patchwork',
    nome: 'Patchwork',
    idJogoBase: null,
    maiorMm: 240,
    menorMm: 240,
    espessuraMm: 55,
    partidas: 9,
  },
  {
    id: 'splendor',
    nome: 'Splendor',
    idJogoBase: null,
    maiorMm: 265,
    menorMm: 265,
    espessuraMm: 70,
    partidas: 11,
  },
]

const COLECAO: readonly CaixaDeJogo[] = LINHAS.map((linha) => ({
  id: linha.id,
  nome: linha.nome,
  medidas: criarMedidas(linha.maiorMm, linha.menorMm, linha.espessuraMm, manual, true),
  idJogoBase: linha.idJogoBase,
  frequencia: { tipo: 'partidas', quantidade: linha.partidas },
  idLudopedia: null,
  idBgg: null,
}))

/**
 * Profundidade de 390 mm, no padrão Kallax. Não é detalhe: uma Billy comum tem
 * 280 mm de profundidade e uma caixa quadrada de 295 mm simplesmente não entra nela.
 * Ver o teste "estante rasa demais" abaixo, que fixa esse fato.
 */
const ESTANTE = montarEstante('kallax', {
  nome: 'Estante funda da sala',
  larguraUtilMm: 760,
  profundidadeUtilMm: 390,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 350, 300],
})

const ESTANTE_RASA = montarEstante('billy', {
  nome: 'Billy da sala',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 350, 300],
})

const executar = () =>
  arranjar({
    jogos: COLECAO,
    estante: ESTANTE,
    pesos: PESOS_PADRAO,
    gerador: geradorMulberry32(20260816),
    iteracoes: 20000,
  })

describe('cenario de regressao', () => {
  it('e deterministico entre execucoes', () => {
    expect(executar().posicoes).toEqual(executar().posicoes)
  })

  it('aloca a colecao inteira nesta estante', () => {
    expect(executar().naoAlocados).toEqual([])
  })

  it('mantem as duas familias inteiras', () => {
    expect(executar().pontuacao.porTermo.familiaDividida).toBe(0)
  })

  it('nao estoura a largura de nenhuma prateleira', () => {
    const arranjo = executar()
    const usado = new Map<string, number>()
    for (const posicao of arranjo.posicoes) {
      const espessura = COLECAO.find((j) => j.id === posicao.idJogo)?.medidas.espessuraMm ?? 0
      usado.set(posicao.idCompartimento, (usado.get(posicao.idCompartimento) ?? 0) + espessura)
    }
    for (const total of usado.values()) expect(total).toBeLessThanOrEqual(760)
  })

  it('registra a pontuacao conhecida', () => {
    // Valor observado numa execucao verde. Nunca ajuste este numero para consertar
    // um teste vermelho: queda de pontuacao aqui e regressao de verdade.
    expect(executar().pontuacao.total).toBeCloseTo(2.515929, 5)
  })
})

describe('estante rasa demais', () => {
  // Fato do mundo real que o motor precisa saber dizer: uma Billy tem 280 mm de
  // profundidade e uma caixa quadrada de 295 mm nao entra nela de jeito nenhum.
  // E exatamente para responder isso que o app existe.
  it('recusa por profundidade as caixas quadradas grandes', () => {
    const arranjo = arranjar({
      jogos: COLECAO,
      estante: ESTANTE_RASA,
      pesos: PESOS_PADRAO,
      gerador: geradorMulberry32(20260816),
      iteracoes: 20000,
    })
    const fundoDemais = arranjo.naoAlocados
      .filter((n) => n.motivo === 'fundo-demais')
      .map((n) => n.idJogo)
      .sort()
    expect(fundoDemais).toEqual(['azul', 'brass', 'catan', 'catan-cid', 'catan-nav', 'ticket'])
  })

  it('diz quantos milimetros faltaram, e nao apenas que nao coube', () => {
    const arranjo = arranjar({
      jogos: COLECAO,
      estante: ESTANTE_RASA,
      pesos: PESOS_PADRAO,
      gerador: geradorMulberry32(20260816),
      iteracoes: 20000,
    })
    const catan = arranjo.naoAlocados.find((n) => n.idJogo === 'catan')
    expect(catan).toEqual({ idJogo: 'catan', motivo: 'fundo-demais', faltaMm: 15 })
  })
})
