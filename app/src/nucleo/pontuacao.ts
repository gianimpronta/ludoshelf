import {
  exigirCompartimento,
  exigirJogo,
  type Arranjo,
  type ContextoDeArranjo,
  type Pontuacao,
} from './arranjo.js'
import { pesoDeFrequencia, type CaixaDeJogo } from './jogo.js'
import type { Milimetros } from './medidas.js'

export interface PesosDeCriterio {
  readonly sobraConcentrada: number
  readonly familiaDividida: number
  readonly alturaDosOlhos: number
}

/**
 * `familiaDividida` domina porque é penalidade forte — mas é finita, então cede
 * quando manter a família junta tornaria o encaixe impossível (spec §7.4).
 */
export const PESOS_PADRAO: PesosDeCriterio = {
  sobraConcentrada: 1,
  familiaDividida: 5,
  alturaDosOlhos: 2,
}

export const CONFORTO_MIN_MM = 1200
export const CONFORTO_MAX_MM = 1650
/** Acima disso não se alcança sem escada; o conforto zera (spec S3). */
export const ALCANCE_MAX_MM = 2200

/**
 * Quão confortável é pegar um jogo cuja base está nesta altura. 1,0 na faixa dos
 * olhos, caindo linearmente para 0 no chão e no limite de alcance.
 *
 * @example conforto(1400) // 1
 */
export function conforto(alturaDaBaseMm: Milimetros): number {
  if (alturaDaBaseMm >= CONFORTO_MIN_MM && alturaDaBaseMm <= CONFORTO_MAX_MM) return 1
  if (alturaDaBaseMm < CONFORTO_MIN_MM) return Math.max(0, alturaDaBaseMm / CONFORTO_MIN_MM)
  return Math.max(0, (ALCANCE_MAX_MM - alturaDaBaseMm) / (ALCANCE_MAX_MM - CONFORTO_MAX_MM))
}

/** Falso quando a coleção inteira está `desconhecida` — a UI avisa nesse caso (spec §10). */
export function haSinalDeFrequencia(jogos: readonly CaixaDeJogo[]): boolean {
  return jogos.some((jogo) => pesoDeFrequencia(jogo.frequencia) > 0)
}

/**
 * Pontua um arranjo. Pura e sem estado: mesma entrada, mesma saída.
 *
 * @example pontuar(arranjo, ctx, PESOS_PADRAO).total
 */
export function pontuar(
  arranjo: Arranjo,
  ctx: ContextoDeArranjo,
  pesos: PesosDeCriterio,
): Pontuacao {
  const porTermo = {
    sobraConcentrada: medirSobraConcentrada(arranjo, ctx),
    familiaDividida: medirFamiliaDividida(arranjo, ctx),
    alturaDosOlhos: medirAlturaDosOlhos(arranjo, ctx),
  }
  const total =
    pesos.sobraConcentrada * porTermo.sobraConcentrada +
    pesos.familiaDividida * porTermo.familiaDividida +
    pesos.alturaDosOlhos * porTermo.alturaDosOlhos
  return { total, porTermo }
}

/** Soma dos quadrados da sobra em metros: concentrar vale mais que espalhar. */
function medirSobraConcentrada(arranjo: Arranjo, ctx: ContextoDeArranjo): number {
  const ocupado = new Map<string, Milimetros>()
  for (const posicao of arranjo.posicoes) {
    const espessura = exigirJogo(ctx, posicao.idJogo).medidas.espessuraMm
    ocupado.set(posicao.idCompartimento, (ocupado.get(posicao.idCompartimento) ?? 0) + espessura)
  }
  let soma = 0
  for (const compartimento of ctx.compartimentos) {
    const livreM = (compartimento.larguraUtilMm - (ocupado.get(compartimento.id) ?? 0)) / 1000
    soma += livreM * livreM
  }
  return soma
}

/** Negativo: uma unidade de penalidade por família espalhada entre compartimentos. */
function medirFamiliaDividida(arranjo: Arranjo, ctx: ContextoDeArranjo): number {
  const compartimentoPorJogo = new Map(
    arranjo.posicoes.map((posicao) => [posicao.idJogo, posicao.idCompartimento]),
  )
  let divididas = 0
  for (const familia of ctx.familias) {
    const alojamentos = new Set(
      familia.membros
        .map((id) => compartimentoPorJogo.get(id))
        .filter((id): id is string => id !== undefined),
    )
    if (alojamentos.size > 1) divididas += 1
  }
  // Negar zero produz `-0`, que `Object.is` distingue de `0` e que a interface
  // mostraria literalmente como "-0". Só nega quando há de fato o que penalizar.
  return divididas === 0 ? 0 : -divididas
}

/** Média do conforto ponderada pela frequência. Zero quando não há sinal nenhum. */
function medirAlturaDosOlhos(arranjo: Arranjo, ctx: ContextoDeArranjo): number {
  let pesoTotal = 0
  let acumulado = 0
  for (const posicao of arranjo.posicoes) {
    const peso = pesoDeFrequencia(exigirJogo(ctx, posicao.idJogo).frequencia)
    if (peso === 0) continue
    pesoTotal += peso
    acumulado += peso * conforto(exigirCompartimento(ctx, posicao.idCompartimento).alturaDaBaseMm)
  }
  return pesoTotal === 0 ? 0 : acumulado / pesoTotal
}
