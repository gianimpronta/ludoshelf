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
    jogosPorId: indexarPorId(jogos),
    compartimentosPorId: new Map(
      estante.compartimentos.map((compartimento) => [compartimento.id, compartimento]),
    ),
    compartimentos: estante.compartimentos,
    familias: agruparFamilias(jogos),
  }
}

/**
 * `new Map` mantém só a última entrada de um id repetido, o que faria pesquisas
 * futuras usarem as medidas e a frequência de um jogo diferente sob o mesmo id.
 * Falha alto para não deixar essa colisão passar em silêncio.
 */
function indexarPorId(jogos: readonly CaixaDeJogo[]): ReadonlyMap<IdJogo, CaixaDeJogo> {
  const porId = new Map<IdJogo, CaixaDeJogo>()
  for (const jogo of jogos) {
    if (porId.has(jogo.id)) {
      throw new RangeError(`id de jogo duplicado; recebido: ${JSON.stringify(jogo.id)}`)
    }
    porId.set(jogo.id, jogo)
  }
  return porId
}

/** Falha alto: um id ausente aqui é defeito de programação, não entrada do usuário. */
export function exigirJogo(contexto: ContextoDeArranjo, id: IdJogo): CaixaDeJogo {
  const jogo = contexto.jogosPorId.get(id)
  if (jogo === undefined) {
    throw new Error(`jogo ausente no contexto; recebido id: ${JSON.stringify(id)}`)
  }
  return jogo
}

export function exigirCompartimento(contexto: ContextoDeArranjo, id: string): Compartimento {
  const compartimento = contexto.compartimentosPorId.get(id)
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
