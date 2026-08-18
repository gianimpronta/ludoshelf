import { describe, expect, it } from 'vitest'
import { montarContexto, type Arranjo } from '../nucleo/arranjo.js'
import { montarEstante } from '../nucleo/estante.js'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { mapear } from './mapear.js'

const manual = { tipo: 'manual' } as const

const jogo = (
  id: string,
  idJogoBase: string | null = null,
  confirmadaPeloUsuario = true,
): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, manual, confirmadaPeloUsuario),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350],
})

const arranjoCom = (naoAlocados: Arranjo['naoAlocados'] = []): Arranjo => ({
  posicoes: [{ idJogo: 'a', idCompartimento: 'e1-p0', deslocamentoXMm: 100, apoio: 'retrato' }],
  naoAlocados,
  pontuacao: { total: 0, porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 } },
})

describe('mapear', () => {
  it('converte milimetros para metros', () => {
    const contexto = montarContexto([jogo('a')], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    const objeto = resultado.objetos[0]
    expect(objeto?.dimensoesXYZ[1]).toBeCloseTo(0.295, 5) // maiorMm em pé (retrato)
  })

  it('posiciona X pela borda esquerda do compartimento, centralizado na estante', () => {
    const contexto = montarContexto([jogo('a')], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    const objeto = resultado.objetos[0]
    // borda esquerda do compartimento = -0.38 (metade de 760mm); deslocamento
    // 100mm + metade da espessura (35mm) = 0.135m a partir da borda.
    expect(objeto?.posicaoXYZ[0]).toBeCloseTo(-0.38 + 0.135, 3)
  })

  it('posiciona Y sobre a base do compartimento', () => {
    const contexto = montarContexto([jogo('a')], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    const objeto = resultado.objetos[0]
    // alturaDaBaseMm do primeiro compartimento = alturaDoRodapeMm = 80mm = 0.08m
    expect(objeto?.posicaoXYZ[1]).toBeCloseTo(0.08 + 0.295 / 2, 3)
  })

  it('atribui a mesma cor a jogos da mesma familia', () => {
    const contexto = montarContexto([jogo('a'), jogo('b', 'a')], estante)
    const arranjo: Arranjo = {
      posicoes: [
        { idJogo: 'a', idCompartimento: 'e1-p0', deslocamentoXMm: 0, apoio: 'retrato' },
        { idJogo: 'b', idCompartimento: 'e1-p0', deslocamentoXMm: 70, apoio: 'retrato' },
      ],
      naoAlocados: [],
      pontuacao: {
        total: 0,
        porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 },
      },
    }
    const resultado = mapear(arranjo, contexto, estante)
    expect(resultado.objetos[0]?.cor).toBe(resultado.objetos[1]?.cor)
  })

  it('marca tracejado quando a medida nao esta confirmada', () => {
    const contexto = montarContexto([jogo('a', null, false)], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    expect(resultado.objetos[0]?.tracejado).toBe(true)
  })

  it('nao marca tracejado quando a medida esta confirmada', () => {
    const contexto = montarContexto([jogo('a', null, true)], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    expect(resultado.objetos[0]?.tracejado).toBe(false)
  })

  it('gera uma prateleira por compartimento', () => {
    // Arranjo vazio de propósito: este teste é só sobre prateleiras, e
    // arranjoCom() sempre inclui uma posição para o jogo 'a', que não existe
    // no contexto vazio — mapear um posicionamento de jogo inexistente falha
    // alto no núcleo (defeito de programação, não entrada do usuário).
    const contexto = montarContexto([], estante)
    const arranjoVazio: Arranjo = {
      posicoes: [],
      naoAlocados: [],
      pontuacao: {
        total: 0,
        porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 },
      },
    }
    const resultado = mapear(arranjoVazio, contexto, estante)
    expect(resultado.prateleiras).toHaveLength(1)
  })

  it('enfileira os nao alocados sem posicao derivada de encaixe', () => {
    const contexto = montarContexto([jogo('a'), jogo('x')], estante)
    const resultado = mapear(
      arranjoCom([{ idJogo: 'x', motivo: 'alto-demais', faltaMm: 30 }]),
      contexto,
      estante,
    )
    expect(resultado.naoAlocados).toHaveLength(1)
    expect(resultado.naoAlocados[0]?.idJogo).toBe('x')
  })
})
