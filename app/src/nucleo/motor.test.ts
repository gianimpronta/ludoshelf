import { describe, expect, it } from 'vitest'
import { montarEstante } from './estante.js'
import { geradorMulberry32 } from './gerador.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'
import { arranjar } from './motor.js'
import { PESOS_PADRAO } from './pontuacao.js'

const manual = { tipo: 'manual' } as const

const jogo = (id: string, espessuraMm: number, partidas = 0): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, espessuraMm, manual, true),
  idJogoBase: null,
  frequencia:
    partidas === 0 ? { tipo: 'desconhecida' } : { tipo: 'partidas', quantidade: partidas },
  idLudopedia: null,
  idBgg: null,
})

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 600,
  profundidadeUtilMm: 320,
  alturaDoRodapeMm: 100,
  espessuraDaPrateleiraMm: 20,
  alturasLivresMm: [350, 350],
})

const arranjarCom = (jogos: readonly CaixaDeJogo[], iteracoes = 20000) =>
  arranjar({ jogos, estante, pesos: PESOS_PADRAO, gerador: geradorMulberry32(42), iteracoes })

describe('arranjar — invariantes', () => {
  it('todo jogo esta posicionado ou tem motivo, nunca os dois nem nenhum', () => {
    const jogos = [jogo('a', 200), jogo('b', 200), jogo('c', 200), jogo('d', 200), jogo('e', 200)]
    const arranjo = arranjarCom(jogos)
    const posicionados = new Set(arranjo.posicoes.map((p) => p.idJogo))
    const recusados = new Set(arranjo.naoAlocados.map((n) => n.idJogo))
    for (const item of jogos) {
      expect(posicionados.has(item.id) !== recusados.has(item.id)).toBe(true)
    }
  })

  it('nenhum jogo aparece duas vezes', () => {
    const jogos = [jogo('a', 100), jogo('b', 100), jogo('c', 100)]
    const ids = arranjarCom(jogos).posicoes.map((p) => p.idJogo)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('o jogo mais alto que qualquer prateleira sai como alto-demais', () => {
    const gigante: CaixaDeJogo = {
      ...jogo('gigante', 80),
      medidas: criarMedidas(500, 480, 80, manual, true),
    }
    const arranjo = arranjarCom([jogo('a', 100), gigante])
    expect(arranjo.naoAlocados).toEqual([
      { idJogo: 'gigante', motivo: 'alto-demais', faltaMm: 130 },
    ])
  })

  // Os mais jogados vem POR ULTIMO na lista de entrada, de proposito. A versao
  // anterior deste teste os punha primeiro e passava por sorte da ordenacao do
  // first-fit, escondendo que o motor deixava de fora um jogo arbitrario.
  it('quando a colecao nao cabe, o que sobra e o menos jogado', () => {
    const jogos = [
      jogo('nunca-jogado', 400, 0),
      jogo('pouco-jogado', 400, 1),
      jogo('bem-jogado', 400, 30),
      jogo('muito-jogado', 400, 50),
    ]
    const arranjo = arranjarCom(jogos)
    const posicionados = arranjo.posicoes.map((p) => p.idJogo)
    expect(arranjo.naoAlocados.length).toBeGreaterThan(0)
    expect(posicionados).toContain('muito-jogado')
    expect(posicionados).not.toContain('nunca-jogado')
  })

  it('devolve pontuacao coerente com os tres termos', () => {
    const arranjo = arranjarCom([jogo('a', 100), jogo('b', 100)])
    expect(Object.keys(arranjo.pontuacao.porTermo).sort()).toEqual([
      'alturaDosOlhos',
      'familiaDividida',
      'sobraConcentrada',
    ])
  })

  it('e deterministico: mesma semente, mesmo arranjo', () => {
    const jogos = [jogo('a', 150), jogo('b', 120), jogo('c', 200), jogo('d', 90)]
    expect(arranjarCom(jogos).posicoes).toEqual(arranjarCom(jogos).posicoes)
  })

  it('nenhum compartimento excede a largura util', () => {
    const jogos = [jogo('a', 250), jogo('b', 250), jogo('c', 250), jogo('d', 250)]
    const arranjo = arranjarCom(jogos)
    const usado = new Map<string, number>()
    for (const posicao of arranjo.posicoes) {
      usado.set(posicao.idCompartimento, (usado.get(posicao.idCompartimento) ?? 0) + 250)
    }
    for (const total of usado.values()) expect(total).toBeLessThanOrEqual(600)
  })
})
