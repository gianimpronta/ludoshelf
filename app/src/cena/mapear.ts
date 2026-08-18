import {
  exigirCompartimento,
  exigirJogo,
  type Arranjo,
  type ContextoDeArranjo,
} from '../nucleo/arranjo.js'
import type { Estante } from '../nucleo/estante.js'
import { corDaFamilia } from './corDaFamilia.js'

const MM_POR_METRO = 1000
const ESPACAMENTO_NAO_ALOCADOS_M = 0.05

export interface ObjetoNaCena {
  readonly idJogo: string
  readonly posicaoXYZ: readonly [number, number, number]
  readonly dimensoesXYZ: readonly [number, number, number]
  readonly cor: string
  readonly tracejado: boolean
}

export interface PrateleiraNaCena {
  readonly idCompartimento: string
  readonly posicaoXYZ: readonly [number, number, number]
  readonly dimensoesXYZ: readonly [number, number, number]
}

export interface NaoAlocadoNaCena {
  readonly idJogo: string
  readonly motivo: string
  readonly posicaoXYZ: readonly [number, number, number]
}

export interface CenaMapeada {
  readonly objetos: readonly ObjetoNaCena[]
  readonly prateleiras: readonly PrateleiraNaCena[]
  readonly naoAlocados: readonly NaoAlocadoNaCena[]
}

/**
 * Converte `Arranjo` + `Estante` em coordenadas de cena, em metros. Função pura
 * — a cena 3D (Task 11) só itera o resultado, nunca decide posição (spec §9).
 *
 * @example mapear(arranjo, contexto, estante).objetos[0].posicaoXYZ
 */
export function mapear(
  arranjo: Arranjo,
  contexto: ContextoDeArranjo,
  estante: Estante,
): CenaMapeada {
  const larguraDaEstanteMm = estante.compartimentos[0]?.larguraUtilMm ?? 0
  const espessuraDaPrateleiraM = estante.espessuraDaPrateleiraMm / MM_POR_METRO

  return {
    objetos: arranjo.posicoes.map((posicao) => mapearObjeto(posicao, contexto, larguraDaEstanteMm)),
    prateleiras: estante.compartimentos.map((compartimento) =>
      mapearPrateleira(compartimento, larguraDaEstanteMm, espessuraDaPrateleiraM),
    ),
    naoAlocados: arranjo.naoAlocados.map((naoAlocado, indice) => ({
      idJogo: naoAlocado.idJogo,
      motivo: naoAlocado.motivo,
      posicaoXYZ: [
        larguraDaEstanteMm / MM_POR_METRO / 2 + 0.3 + indice * ESPACAMENTO_NAO_ALOCADOS_M,
        0.1,
        0,
      ] as const,
    })),
  }
}

function mapearObjeto(
  posicao: Arranjo['posicoes'][number],
  contexto: ContextoDeArranjo,
  larguraDaEstanteMm: number,
): ObjetoNaCena {
  const jogo = exigirJogo(contexto, posicao.idJogo)
  const compartimento = exigirCompartimento(contexto, posicao.idCompartimento)
  const { medidas } = jogo

  const [alturaMm, profundidadeMm] =
    posicao.apoio === 'retrato'
      ? [medidas.maiorMm, medidas.menorMm]
      : [medidas.menorMm, medidas.maiorMm]

  const xM =
    -larguraDaEstanteMm / MM_POR_METRO / 2 +
    (posicao.deslocamentoXMm + medidas.espessuraMm / 2) / MM_POR_METRO
  const yM = (compartimento.alturaDaBaseMm + alturaMm / 2) / MM_POR_METRO

  return {
    idJogo: jogo.id,
    posicaoXYZ: [xM, yM, 0],
    dimensoesXYZ: [
      medidas.espessuraMm / MM_POR_METRO,
      alturaMm / MM_POR_METRO,
      profundidadeMm / MM_POR_METRO,
    ],
    cor: corDaFamilia(jogo.idJogoBase ?? jogo.id),
    tracejado: !medidas.confirmadaPeloUsuario,
  }
}

function mapearPrateleira(
  compartimento: ContextoDeArranjo['compartimentos'][number],
  larguraDaEstanteMm: number,
  espessuraDaPrateleiraM: number,
): PrateleiraNaCena {
  return {
    idCompartimento: compartimento.id,
    posicaoXYZ: [0, compartimento.alturaDaBaseMm / MM_POR_METRO - espessuraDaPrateleiraM / 2, 0],
    dimensoesXYZ: [
      larguraDaEstanteMm / MM_POR_METRO,
      espessuraDaPrateleiraM,
      compartimento.profundidadeUtilMm / MM_POR_METRO,
    ],
  }
}
