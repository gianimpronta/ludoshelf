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
 * @example montarArranjoInicial(jogos, contexto).naoAlocados
 */
export function montarArranjoInicial(
  jogos: readonly CaixaDeJogo[],
  contexto: ContextoDeArranjo,
): Arranjo {
  const livrePorCompartimento = new Map(
    contexto.compartimentos.map((compartimento) => [
      compartimento.id,
      compartimento.larguraUtilMm as Milimetros,
    ]),
  )
  const posicoes: PosicaoDeJogo[] = []
  const naoAlocados: JogoNaoAlocado[] = []

  for (const unidade of montarUnidades(jogos, contexto)) {
    const destino = acharCompartimentoParaUnidade(unidade, contexto, livrePorCompartimento)
    if (destino !== null) {
      inserirMembros(unidade.membros, destino, livrePorCompartimento, posicoes)
      continue
    }
    for (const membro of unidade.membros) {
      inserirMembroSozinho(membro, contexto, livrePorCompartimento, posicoes, naoAlocados)
    }
  }
  return { posicoes, naoAlocados, pontuacao: PONTUACAO_ZERADA }
}

/** Famílias viram um bloco; o resto vira unidade de um. Ordena por espessura decrescente. */
function montarUnidades(jogos: readonly CaixaDeJogo[], contexto: ContextoDeArranjo): Unidade[] {
  const emFamilia = new Set<IdJogo>()
  const unidades: Unidade[] = []

  for (const familia of contexto.familias) {
    const membros = familia.membros.map((id) => exigirJogo(contexto, id))
    membros.forEach((membro) => emFamilia.add(membro.id))
    unidades.push({ membros, espessuraTotalMm: somarEspessuras(membros) })
  }
  for (const jogo of jogos) {
    if (emFamilia.has(jogo.id)) continue
    unidades.push({ membros: [jogo], espessuraTotalMm: jogo.medidas.espessuraMm })
  }
  return unidades.sort(
    (unidadeA, unidadeB) => unidadeB.espessuraTotalMm - unidadeA.espessuraTotalMm,
  )
}

function somarEspessuras(membros: readonly CaixaDeJogo[]): Milimetros {
  return membros.reduce((soma, membro) => soma + membro.medidas.espessuraMm, 0)
}

function acharCompartimentoParaUnidade(
  unidade: Unidade,
  contexto: ContextoDeArranjo,
  livre: ReadonlyMap<string, Milimetros>,
): Compartimento | null {
  for (const compartimento of contexto.compartimentos) {
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
  contexto: ContextoDeArranjo,
  livre: Map<string, Milimetros>,
  posicoes: PosicaoDeJogo[],
  naoAlocados: JogoNaoAlocado[],
): void {
  const unidade: Unidade = { membros: [membro], espessuraTotalMm: membro.medidas.espessuraMm }
  const destino = acharCompartimentoParaUnidade(unidade, contexto, livre)
  if (destino === null) {
    naoAlocados.push(diagnosticarNaoAlocado(membro, contexto, livre))
    return
  }
  inserirMembros([membro], destino, livre, posicoes)
}

/**
 * Explica por que o jogo ficou de fora. Se ele caberia dimensionalmente em algum
 * compartimento, o problema é largura ocupada — `sem-espaco`, com a menor falta.
 * Caso contrário, devolve a recusa dimensional menos severa.
 *
 * Exportada porque a busca local também desaloca jogos ao trocá-los por pendentes,
 * e o motivo tem de ser recalculado do mesmo jeito.
 *
 * Pré-condição do chamador: o jogo realmente não cabe em compartimento nenhum da
 * lotação atual. Se essa pré-condição for violada — o jogo cabe com folga em
 * algum lugar —, a função falha alto em vez de devolver `sem-espaco` com
 * `faltaMm` zero ou negativo, que mentiria sobre o motivo.
 *
 * @example diagnosticarNaoAlocado(jogo, contexto, livre) // { motivo: 'sem-espaco', faltaMm: 41 }
 */
export function diagnosticarNaoAlocado(
  membro: CaixaDeJogo,
  contexto: ContextoDeArranjo,
  livre: ReadonlyMap<string, Milimetros>,
): JogoNaoAlocado {
  let melhorRecusa: JogoNaoAlocado | null = null
  let menorFaltaDeEspaco: Milimetros | null = null

  for (const compartimento of contexto.compartimentos) {
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
    if (menorFaltaDeEspaco <= 0) {
      throw new Error(
        `pré-condição violada: o jogo ${membro.id} cabe com ${-menorFaltaDeEspaco}mm de ` +
          'folga em algum compartimento, mas foi diagnosticado como não alocado',
      )
    }
    return { idJogo: membro.id, motivo: 'sem-espaco', faltaMm: menorFaltaDeEspaco }
  }
  if (melhorRecusa === null) {
    throw new Error(`estante sem compartimentos ao diagnosticar o jogo ${membro.id}`)
  }
  return melhorRecusa
}
