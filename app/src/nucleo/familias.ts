import type { CaixaDeJogo, IdJogo } from './jogo.js'

/** Jogo-base mais suas expansões. O base é sempre o primeiro membro. */
export interface Familia {
  readonly idBase: IdJogo
  readonly membros: readonly IdJogo[]
}

/**
 * Agrupa jogos-base com suas expansões. Só devolve grupos de dois ou mais: um jogo
 * solto não pode ser "dividido", então não interessa à penalidade de família (spec §7.4).
 *
 * @example agruparFamilias(jogos) // [{ idBase: 'a', membros: ['a', 'b'] }]
 */
export function agruparFamilias(jogos: readonly CaixaDeJogo[]): readonly Familia[] {
  const idsPresentes = new Set(jogos.map((jogo) => jogo.id))
  const expansoesPorBase = new Map<IdJogo, IdJogo[]>()

  for (const jogo of jogos) {
    if (jogo.idJogoBase === null || !idsPresentes.has(jogo.idJogoBase)) continue
    const irmas = expansoesPorBase.get(jogo.idJogoBase) ?? []
    irmas.push(jogo.id)
    expansoesPorBase.set(jogo.idJogoBase, irmas)
  }

  // `idJogoBase === null` é o que impede auto-referência e ciclo: quem já é expansão
  // nunca vira base. Sem isso, `a→b` com `b→a` produziria duas famílias sobrepostas,
  // e `a→a` produziria uma família com o membro repetido — os dois em silêncio.
  return jogos
    .filter((jogo) => jogo.idJogoBase === null && expansoesPorBase.has(jogo.id))
    .map((base) => ({
      idBase: base.id,
      membros: [base.id, ...(expansoesPorBase.get(base.id) ?? [])],
    }))
}
