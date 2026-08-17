import {
  exigirJogo,
  PONTUACAO_ZERADA,
  type Arranjo,
  type ContextoDeArranjo,
  type JogoNaoAlocado,
  type PosicaoDeJogo,
} from './arranjo.js'
import { encaixar } from './encaixe.js'
import type { Compartimento } from './estante.js'
import type { CaixaDeJogo, IdJogo } from './jogo.js'
import type { Milimetros } from './medidas.js'

/** Uma família inteira ou um jogo solto. É a granularidade da inserção gulosa. */
interface Unidade {
  readonly membros: readonly CaixaDeJogo[]
  readonly espessuraTotalMm: Milimetros
}

/**
 * First-Fit Decreasing: unidades mais grossas primeiro, cada uma no primeiro
 * compartimento onde couber. A pontuação sai zerada — quem pontua é o motor.
 *
 * @example montarArranjoInicial(jogos, ctx).naoAlocados
 */
export function montarArranjoInicial(
  jogos: readonly CaixaDeJogo[],
  ctx: ContextoDeArranjo,
): Arranjo {
  const livrePorCompartimento = new Map(
    ctx.compartimentos.map((c) => [c.id, c.larguraUtilMm as Milimetros]),
  )
  const posicoes: PosicaoDeJogo[] = []
  const naoAlocados: JogoNaoAlocado[] = []

  for (const unidade of montarUnidades(jogos, ctx)) {
    const destino = acharCompartimentoParaUnidade(unidade, ctx, livrePorCompartimento)
    if (destino !== null) {
      inserirMembros(unidade.membros, destino, livrePorCompartimento, posicoes)
      continue
    }
    for (const membro of unidade.membros) {
      inserirMembroSozinho(membro, ctx, livrePorCompartimento, posicoes, naoAlocados)
    }
  }
  return { posicoes, naoAlocados, pontuacao: PONTUACAO_ZERADA }
}

/** Famílias viram um bloco; o resto vira unidade de um. Ordena por espessura decrescente. */
function montarUnidades(jogos: readonly CaixaDeJogo[], ctx: ContextoDeArranjo): Unidade[] {
  const emFamilia = new Set<IdJogo>()
  const unidades: Unidade[] = []

  for (const familia of ctx.familias) {
    const membros = familia.membros.map((id) => exigirJogo(ctx, id))
    membros.forEach((membro) => emFamilia.add(membro.id))
    unidades.push({ membros, espessuraTotalMm: somarEspessuras(membros) })
  }
  for (const jogo of jogos) {
    if (emFamilia.has(jogo.id)) continue
    unidades.push({ membros: [jogo], espessuraTotalMm: jogo.medidas.espessuraMm })
  }
  return unidades.sort((a, b) => b.espessuraTotalMm - a.espessuraTotalMm)
}

function somarEspessuras(membros: readonly CaixaDeJogo[]): Milimetros {
  return membros.reduce((soma, membro) => soma + membro.medidas.espessuraMm, 0)
}

function acharCompartimentoParaUnidade(
  unidade: Unidade,
  ctx: ContextoDeArranjo,
  livre: ReadonlyMap<string, Milimetros>,
): Compartimento | null {
  for (const compartimento of ctx.compartimentos) {
    const cabeDimensionalmente = unidade.membros.every(
      (membro) => encaixar(membro.medidas, compartimento).cabe,
    )
    const sobra = livre.get(compartimento.id) ?? 0
    if (cabeDimensionalmente && unidade.espessuraTotalMm <= sobra) return compartimento
  }
  return null
}

function inserirMembros(
  membros: readonly CaixaDeJogo[],
  compartimento: Compartimento,
  livre: Map<string, Milimetros>,
  posicoes: PosicaoDeJogo[],
): void {
  for (const membro of membros) {
    const resultado = encaixar(membro.medidas, compartimento)
    if (!resultado.cabe) {
      throw new Error(`membro ${membro.id} nao cabe em ${compartimento.id}`)
    }
    const usado = compartimento.larguraUtilMm - (livre.get(compartimento.id) ?? 0)
    posicoes.push({
      idJogo: membro.id,
      idCompartimento: compartimento.id,
      deslocamentoXMm: usado,
      apoio: resultado.apoio,
    })
    livre.set(compartimento.id, (livre.get(compartimento.id) ?? 0) - membro.medidas.espessuraMm)
  }
}

function inserirMembroSozinho(
  membro: CaixaDeJogo,
  ctx: ContextoDeArranjo,
  livre: Map<string, Milimetros>,
  posicoes: PosicaoDeJogo[],
  naoAlocados: JogoNaoAlocado[],
): void {
  const unidade: Unidade = { membros: [membro], espessuraTotalMm: membro.medidas.espessuraMm }
  const destino = acharCompartimentoParaUnidade(unidade, ctx, livre)
  if (destino === null) {
    naoAlocados.push(diagnosticar(membro, ctx, livre))
    return
  }
  inserirMembros([membro], destino, livre, posicoes)
}

/**
 * Explica por que o jogo ficou de fora. Se ele caberia dimensionalmente em algum
 * compartimento, o problema é largura ocupada — `sem-espaco`, com a menor falta.
 * Caso contrário, devolve a recusa dimensional menos severa.
 */
function diagnosticar(
  membro: CaixaDeJogo,
  ctx: ContextoDeArranjo,
  livre: ReadonlyMap<string, Milimetros>,
): JogoNaoAlocado {
  let melhorRecusa: JogoNaoAlocado | null = null
  let menorFaltaDeEspaco: Milimetros | null = null

  for (const compartimento of ctx.compartimentos) {
    const resultado = encaixar(membro.medidas, compartimento)
    if (resultado.cabe) {
      const falta = membro.medidas.espessuraMm - (livre.get(compartimento.id) ?? 0)
      if (menorFaltaDeEspaco === null || falta < menorFaltaDeEspaco) menorFaltaDeEspaco = falta
      continue
    }
    if (melhorRecusa === null || resultado.faltaMm < melhorRecusa.faltaMm) {
      melhorRecusa = { idJogo: membro.id, motivo: resultado.motivo, faltaMm: resultado.faltaMm }
    }
  }
  if (menorFaltaDeEspaco !== null) {
    return { idJogo: membro.id, motivo: 'sem-espaco', faltaMm: menorFaltaDeEspaco }
  }
  if (melhorRecusa === null) {
    throw new Error(`estante sem compartimentos ao diagnosticar o jogo ${membro.id}`)
  }
  return melhorRecusa
}
