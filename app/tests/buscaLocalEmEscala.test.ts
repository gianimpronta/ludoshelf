import { expect, it } from 'vitest'
import { montarContexto } from '../src/nucleo/arranjo.js'
import { montarArranjoInicial } from '../src/nucleo/arranjoInicial.js'
import { melhorar } from '../src/nucleo/buscaLocal.js'
import { montarEstante } from '../src/nucleo/estante.js'
import { geradorMulberry32 } from '../src/nucleo/gerador.js'
import { criarMedidas, type CaixaDeJogo } from '../src/nucleo/jogo.js'
import { PESOS_PADRAO } from '../src/nucleo/pontuacao.js'

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

/**
 * Coleção de 43 jogos — escala próxima do alvo da spec (50–300) — com uma
 * família e espaço apertado o bastante para gerar pendentes de verdade.
 */
function montarColecaoEmEscala(): CaixaDeJogo[] {
  const jogos: CaixaDeJogo[] = [
    jogo('base', 90),
    jogo('exp1', 70, 'base'),
    jogo('exp2', 60, 'base'),
  ]
  for (let i = 0; i < 40; i += 1) {
    jogos.push(jogo(`solto${i}`, 40 + ((i * 37) % 90)))
  }
  return jogos
}

/**
 * Este cenário, numa varredura de sementes, reproduziu duas falhas reais que os
 * testes pequenos e artesanais do resto da suíte não pegavam: `trocarComPendente`
 * desalojando um jogo que na verdade ainda cabia em outro compartimento (violando
 * a pré-condição de `diagnosticarNaoAlocado`), e o risco equivalente em
 * `moverFamilia`. Cenários pequenos não têm folga suficiente para essas interações
 * emergirem — só apareceram numa coleção deste tamanho. Por isso o teste roda em
 * escala, não com 3–5 jogos como o resto do arquivo de busca local.
 */
it('nao produz nem posicao duplicada nem duplicata entre posicoes e naoAlocados, em escala', () => {
  const estante = montarEstante('e', {
    nome: 'Estante em escala',
    larguraUtilMm: 750,
    profundidadeUtilMm: 320,
    alturaDoRodapeMm: 100,
    espessuraDaPrateleiraMm: 18,
    alturasLivresMm: [350, 350, 350, 350],
  })
  const jogos = montarColecaoEmEscala()

  for (let semente = 1; semente <= 15; semente += 1) {
    const contexto = montarContexto(jogos, estante)
    const inicial = montarArranjoInicial(jogos, contexto)
    const resultado = melhorar(inicial, contexto, PESOS_PADRAO, geradorMulberry32(semente), 20000)

    const posicionados = new Set(resultado.posicoes.map((p) => p.idJogo))
    const pendentes = new Set(resultado.naoAlocados.map((n) => n.idJogo))
    expect(posicionados.size).toBe(resultado.posicoes.length) // nenhuma posição duplicada
    expect([...posicionados].some((id) => pendentes.has(id))).toBe(false)
    expect(resultado.posicoes.length + resultado.naoAlocados.length).toBe(jogos.length)
  }
})
