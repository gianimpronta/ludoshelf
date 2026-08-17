import { montarContexto, type Arranjo } from './arranjo.js'
import { montarArranjoInicial } from './arranjoInicial.js'
import { melhorar } from './buscaLocal.js'
import type { Estante } from './estante.js'
import type { Gerador } from './gerador.js'
import type { CaixaDeJogo } from './jogo.js'
import { ordenarParaExibicao } from './ordenacao.js'
import { pontuar, type PesosDeCriterio } from './pontuacao.js'

export interface EntradaDoMotor {
  readonly jogos: readonly CaixaDeJogo[]
  readonly estante: Estante
  readonly pesos: PesosDeCriterio
  readonly gerador: Gerador
  /** Dezenas de milhares são milissegundos para 50–300 jogos (spec §7.5). */
  readonly iteracoes: number
}

/**
 * Constrói, melhora e ordena. As três etapas da spec §7.3, nesta ordem.
 *
 * @example arranjar({ jogos, estante, pesos: PESOS_PADRAO, gerador, iteracoes: 20000 })
 */
export function arranjar(entrada: EntradaDoMotor): Arranjo {
  const ctx = montarContexto(entrada.jogos, entrada.estante)
  const inicial = montarArranjoInicial(entrada.jogos, ctx)
  const melhorado = melhorar(inicial, ctx, entrada.pesos, entrada.gerador, entrada.iteracoes)
  const ordenado = ordenarParaExibicao(melhorado, ctx)
  return { ...ordenado, pontuacao: pontuar(ordenado, ctx, entrada.pesos) }
}
