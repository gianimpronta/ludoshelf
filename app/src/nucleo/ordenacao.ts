import { exigirJogo, type Arranjo, type ContextoDeArranjo, type PosicaoDeJogo } from './arranjo.js'
import type { CaixaDeJogo } from './jogo.js'
import { normalizarNome, type Milimetros } from './medidas.js'

/**
 * Reordena cada compartimento e recalcula os deslocamentos. Não muda quem está
 * onde — só a sequência —, o que é seguro porque a ordem não afeta o encaixe:
 * cada caixa consome sua espessura e a soma independe da ordem.
 *
 * @example ordenarParaExibicao(arranjo, ctx).posicoes[0].idJogo
 */
export function ordenarParaExibicao(arranjo: Arranjo, ctx: ContextoDeArranjo): Arranjo {
  const porCompartimento = new Map<string, PosicaoDeJogo[]>()
  for (const posicao of arranjo.posicoes) {
    const lista = porCompartimento.get(posicao.idCompartimento) ?? []
    lista.push(posicao)
    porCompartimento.set(posicao.idCompartimento, lista)
  }

  const posicoes: PosicaoDeJogo[] = []
  for (const lista of porCompartimento.values()) {
    lista.sort((a, b) => comparar(exigirJogo(ctx, a.idJogo), exigirJogo(ctx, b.idJogo), ctx))
    posicoes.push(...reposicionar(lista, ctx))
  }
  return { ...arranjo, posicoes }
}

/** Ordena por família, depois base antes de expansão, depois nome. */
function comparar(a: CaixaDeJogo, b: CaixaDeJogo, ctx: ContextoDeArranjo): number {
  const familiaA = chaveDeFamilia(a, ctx)
  const familiaB = chaveDeFamilia(b, ctx)
  if (familiaA !== familiaB) return familiaA < familiaB ? -1 : 1

  const ordemA = a.idJogoBase === null ? 0 : 1
  const ordemB = b.idJogoBase === null ? 0 : 1
  if (ordemA !== ordemB) return ordemA - ordemB

  return normalizarNome(a.nome).localeCompare(normalizarNome(b.nome))
}

/** Expansão herda a chave do seu base, e por isso ordena junto dele. */
function chaveDeFamilia(jogo: CaixaDeJogo, ctx: ContextoDeArranjo): string {
  if (jogo.idJogoBase === null) return normalizarNome(jogo.nome)
  const base = ctx.jogosPorId.get(jogo.idJogoBase)
  return normalizarNome(base?.nome ?? jogo.nome)
}

function reposicionar(
  lista: readonly PosicaoDeJogo[],
  ctx: ContextoDeArranjo,
): readonly PosicaoDeJogo[] {
  let deslocamentoXMm: Milimetros = 0
  return lista.map((posicao) => {
    const atual = { ...posicao, deslocamentoXMm }
    deslocamentoXMm += exigirJogo(ctx, posicao.idJogo).medidas.espessuraMm
    return atual
  })
}
