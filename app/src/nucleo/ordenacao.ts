import { exigirJogo, type Arranjo, type ContextoDeArranjo, type PosicaoDeJogo } from './arranjo.js'
import type { CaixaDeJogo } from './jogo.js'
import { normalizarNome, type Milimetros } from './medidas.js'

/**
 * Reordena cada compartimento e recalcula os deslocamentos. Não muda quem está
 * onde — só a sequência —, o que é seguro porque a ordem não afeta o encaixe:
 * cada caixa consome sua espessura e a soma independe da ordem.
 *
 * @example ordenarParaExibicao(arranjo, contexto).posicoes[0].idJogo
 */
export function ordenarParaExibicao(arranjo: Arranjo, contexto: ContextoDeArranjo): Arranjo {
  const porCompartimento = new Map<string, PosicaoDeJogo[]>()
  for (const posicao of arranjo.posicoes) {
    const lista = porCompartimento.get(posicao.idCompartimento) ?? []
    lista.push(posicao)
    porCompartimento.set(posicao.idCompartimento, lista)
  }

  const posicoes: PosicaoDeJogo[] = []
  for (const lista of porCompartimento.values()) {
    lista.sort((posicaoA, posicaoB) =>
      comparar(
        exigirJogo(contexto, posicaoA.idJogo),
        exigirJogo(contexto, posicaoB.idJogo),
        contexto,
      ),
    )
    posicoes.push(...reposicionar(lista, contexto))
  }
  return { ...arranjo, posicoes }
}

/** Ordena por família (nome, depois id do base), depois base antes de expansão, depois nome. */
function comparar(jogoA: CaixaDeJogo, jogoB: CaixaDeJogo, contexto: ContextoDeArranjo): number {
  const nomeDaFamiliaA = nomeDaFamilia(jogoA, contexto)
  const nomeDaFamiliaB = nomeDaFamilia(jogoB, contexto)
  if (nomeDaFamiliaA !== nomeDaFamiliaB) return nomeDaFamiliaA < nomeDaFamiliaB ? -1 : 1

  // Duas famílias distintas podem ter o mesmo nome normalizado — duas bases
  // diferentes cadastradas como "Catan", por exemplo. Sem este desempate por id,
  // todas as bases empatadas ficariam juntas e só depois todas as expansões,
  // misturando famílias em vez de manter cada expansão junto do seu próprio base.
  const idDaFamiliaA = idDaFamilia(jogoA)
  const idDaFamiliaB = idDaFamilia(jogoB)
  if (idDaFamiliaA !== idDaFamiliaB) return idDaFamiliaA < idDaFamiliaB ? -1 : 1

  const ordemA = jogoA.idJogoBase === null ? 0 : 1
  const ordemB = jogoB.idJogoBase === null ? 0 : 1
  if (ordemA !== ordemB) return ordemA - ordemB

  return normalizarNome(jogoA.nome).localeCompare(normalizarNome(jogoB.nome))
}

/** Expansão herda o nome do seu base, e por isso ordena junto dele alfabeticamente. */
function nomeDaFamilia(jogo: CaixaDeJogo, contexto: ContextoDeArranjo): string {
  if (jogo.idJogoBase === null) return normalizarNome(jogo.nome)
  const base = contexto.jogosPorId.get(jogo.idJogoBase)
  return normalizarNome(base?.nome ?? jogo.nome)
}

/** Identifica a família por um id estável, e não pelo nome, que pode se repetir. */
function idDaFamilia(jogo: CaixaDeJogo): string {
  return jogo.idJogoBase ?? jogo.id
}

function reposicionar(
  lista: readonly PosicaoDeJogo[],
  contexto: ContextoDeArranjo,
): readonly PosicaoDeJogo[] {
  let deslocamentoXMm: Milimetros = 0
  return lista.map((posicao) => {
    const atual = { ...posicao, deslocamentoXMm }
    deslocamentoXMm += exigirJogo(contexto, posicao.idJogo).medidas.espessuraMm
    return atual
  })
}
