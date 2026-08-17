import type { Apoio, MotivoDeRecusa } from './encaixe.js'
import type { Compartimento, Estante } from './estante.js'
import { agruparFamilias, type Familia } from './familias.js'
import type { CaixaDeJogo, IdJogo } from './jogo.js'
import type { Milimetros } from './medidas.js'

export interface PosicaoDeJogo {
  readonly idJogo: IdJogo
  readonly idCompartimento: string
  /** A partir da borda esquerda do compartimento. */
  readonly deslocamentoXMm: Milimetros
  readonly apoio: Apoio
}

/** `sem-espaco` significa que a caixa caberia nas dimensões, mas não sobrou largura. */
export type MotivoDeNaoAlocacao = MotivoDeRecusa | 'sem-espaco'

export interface JogoNaoAlocado {
  readonly idJogo: IdJogo
  readonly motivo: MotivoDeNaoAlocacao
  readonly faltaMm: Milimetros
}

export type NomeDeTermo = 'sobraConcentrada' | 'familiaDividida' | 'alturaDosOlhos'

export interface Pontuacao {
  readonly total: number
  readonly porTermo: Readonly<Record<NomeDeTermo, number>>
}

export interface Arranjo {
  readonly posicoes: readonly PosicaoDeJogo[]
  readonly naoAlocados: readonly JogoNaoAlocado[]
  readonly pontuacao: Pontuacao
}

/** Índices derivados uma vez e reusados em cada iteração da busca local. */
export interface ContextoDeArranjo {
  readonly jogosPorId: ReadonlyMap<IdJogo, CaixaDeJogo>
  readonly compartimentosPorId: ReadonlyMap<string, Compartimento>
  readonly compartimentos: readonly Compartimento[]
  readonly familias: readonly Familia[]
}

/**
 * Constrói os índices usados pelo motor. Fazer isso uma vez, e não a cada iteração,
 * é o que mantém a busca local barata.
 *
 * @example montarContexto(jogos, estante).jogosPorId.get('a')
 */
export function montarContexto(jogos: readonly CaixaDeJogo[], estante: Estante): ContextoDeArranjo {
  return {
    jogosPorId: new Map(jogos.map((jogo) => [jogo.id, jogo])),
    compartimentosPorId: new Map(estante.compartimentos.map((c) => [c.id, c])),
    compartimentos: estante.compartimentos,
    familias: agruparFamilias(jogos),
  }
}

/** Falha alto: um id ausente aqui é defeito de programação, não entrada do usuário. */
export function exigirJogo(ctx: ContextoDeArranjo, id: IdJogo): CaixaDeJogo {
  const jogo = ctx.jogosPorId.get(id)
  if (jogo === undefined) {
    throw new Error(`jogo ausente no contexto; recebido id: ${JSON.stringify(id)}`)
  }
  return jogo
}

export function exigirCompartimento(ctx: ContextoDeArranjo, id: string): Compartimento {
  const compartimento = ctx.compartimentosPorId.get(id)
  if (compartimento === undefined) {
    throw new Error(`compartimento ausente no contexto; recebido id: ${JSON.stringify(id)}`)
  }
  return compartimento
}

/** Pontuação neutra, usada antes de o motor pontuar de verdade. */
export const PONTUACAO_ZERADA: Pontuacao = {
  total: 0,
  porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 },
}
