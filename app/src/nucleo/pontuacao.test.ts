import { describe, expect, it } from 'vitest'
import { montarContexto, PONTUACAO_ZERADA, type Arranjo } from './arranjo.js'
import { montarEstante } from './estante.js'
import { criarMedidas, type CaixaDeJogo, type SinalDeFrequencia } from './jogo.js'
import { conforto, haSinalDeFrequencia, pontuar, PESOS_PADRAO } from './pontuacao.js'

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 1000,
  profundidadeUtilMm: 320,
  alturaDoRodapeMm: 100,
  espessuraDaPrateleiraMm: 20,
  alturasLivresMm: [400, 400, 400, 400],
})

const jogo = (
  id: string,
  idJogoBase: string | null = null,
  frequencia: SinalDeFrequencia = { tipo: 'desconhecida' },
): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 100, { tipo: 'manual' }, true),
  idJogoBase,
  frequencia,
  idLudopedia: null,
  idBgg: null,
})

const arranjoCom = (
  posicoes: ReadonlyArray<{ idJogo: string; idCompartimento: string }>,
): Arranjo => ({
  posicoes: posicoes.map((p) => ({ ...p, deslocamentoXMm: 0, apoio: 'retrato' as const })),
  naoAlocados: [],
  pontuacao: PONTUACAO_ZERADA,
})

describe('conforto', () => {
  it('vale 1 dentro da faixa de 1200 a 1650 mm', () => {
    expect(conforto(1200)).toBe(1)
    expect(conforto(1650)).toBe(1)
  })

  it('cai proporcionalmente abaixo da faixa', () => {
    expect(conforto(600)).toBeCloseTo(0.5, 5)
  })

  it('cai acima da faixa e zera no limite de alcance', () => {
    expect(conforto(2200)).toBe(0)
  })

  it('nunca fica negativo acima do limite de alcance', () => {
    expect(conforto(3000)).toBe(0)
  })
})

describe('pontuar — sobra concentrada', () => {
  it('premia a sobra reunida num compartimento so', () => {
    const ctx = montarContexto([jogo('a'), jogo('b')], estante)
    const juntos = pontuar(
      arranjoCom([
        { idJogo: 'a', idCompartimento: 'e1-p0' },
        { idJogo: 'b', idCompartimento: 'e1-p0' },
      ]),
      ctx,
      PESOS_PADRAO,
    )
    const separados = pontuar(
      arranjoCom([
        { idJogo: 'a', idCompartimento: 'e1-p0' },
        { idJogo: 'b', idCompartimento: 'e1-p1' },
      ]),
      ctx,
      PESOS_PADRAO,
    )
    expect(juntos.porTermo.sobraConcentrada).toBeGreaterThan(separados.porTermo.sobraConcentrada)
  })
})

describe('pontuar — familia dividida', () => {
  it('nao penaliza familia inteira no mesmo compartimento', () => {
    const ctx = montarContexto([jogo('a'), jogo('b', 'a')], estante)
    const pontuacao = pontuar(
      arranjoCom([
        { idJogo: 'a', idCompartimento: 'e1-p0' },
        { idJogo: 'b', idCompartimento: 'e1-p0' },
      ]),
      ctx,
      PESOS_PADRAO,
    )
    expect(pontuacao.porTermo.familiaDividida).toBe(0)
  })

  it('penaliza uma vez por familia espalhada', () => {
    const ctx = montarContexto([jogo('a'), jogo('b', 'a')], estante)
    const pontuacao = pontuar(
      arranjoCom([
        { idJogo: 'a', idCompartimento: 'e1-p0' },
        { idJogo: 'b', idCompartimento: 'e1-p1' },
      ]),
      ctx,
      PESOS_PADRAO,
    )
    expect(pontuacao.porTermo.familiaDividida).toBe(-1)
  })
})

describe('pontuar — altura dos olhos', () => {
  it('premia o jogo mais jogado na prateleira confortavel', () => {
    const jogos = [jogo('a', null, { tipo: 'partidas', quantidade: 30 }), jogo('b')]
    const ctx = montarContexto(jogos, estante)
    // e1-p2 tem base 940 mm; e1-p0 tem base 100 mm.
    const alto = pontuar(arranjoCom([{ idJogo: 'a', idCompartimento: 'e1-p2' }]), ctx, PESOS_PADRAO)
    const baixo = pontuar(
      arranjoCom([{ idJogo: 'a', idCompartimento: 'e1-p0' }]),
      ctx,
      PESOS_PADRAO,
    )
    expect(alto.porTermo.alturaDosOlhos).toBeGreaterThan(baixo.porTermo.alturaDosOlhos)
  })

  it('zera o termo quando ninguem tem sinal de frequencia', () => {
    const ctx = montarContexto([jogo('a')], estante)
    const pontuacao = pontuar(
      arranjoCom([{ idJogo: 'a', idCompartimento: 'e1-p1' }]),
      ctx,
      PESOS_PADRAO,
    )
    expect(pontuacao.porTermo.alturaDosOlhos).toBe(0)
  })
})

describe('pontuar — total', () => {
  it('combina os tres termos com os pesos informados', () => {
    const ctx = montarContexto([jogo('a'), jogo('b', 'a')], estante)
    const arranjo = arranjoCom([
      { idJogo: 'a', idCompartimento: 'e1-p0' },
      { idJogo: 'b', idCompartimento: 'e1-p1' },
    ])
    const { total, porTermo } = pontuar(arranjo, ctx, PESOS_PADRAO)
    const esperado =
      PESOS_PADRAO.sobraConcentrada * porTermo.sobraConcentrada +
      PESOS_PADRAO.familiaDividida * porTermo.familiaDividida +
      PESOS_PADRAO.alturaDosOlhos * porTermo.alturaDosOlhos
    expect(total).toBeCloseTo(esperado, 10)
  })
})

describe('haSinalDeFrequencia', () => {
  it('e falso quando a colecao inteira e desconhecida', () => {
    expect(haSinalDeFrequencia([jogo('a'), jogo('b')])).toBe(false)
  })

  it('e falso quando todos tem zero partidas registradas', () => {
    expect(haSinalDeFrequencia([jogo('a', null, { tipo: 'partidas', quantidade: 0 })])).toBe(false)
  })

  it('e verdadeiro com ao menos um destaque', () => {
    const marcado = jogo('a', null, { tipo: 'destaque', marcadoPeloUsuario: true })
    expect(haSinalDeFrequencia([marcado])).toBe(true)
  })
})
