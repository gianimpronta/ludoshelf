import {
  exigirCompartimento,
  exigirJogo,
  PONTUACAO_ZERADA,
  type Arranjo,
  type ContextoDeArranjo,
  type JogoNaoAlocado,
  type PosicaoDeJogo,
} from './arranjo.js'
import { diagnosticarNaoAlocado } from './arranjoInicial.js'
import { encaixar } from './encaixe.js'
import { sortearIndice, type Gerador } from './gerador.js'
import type { IdJogo } from './jogo.js'
import type { Milimetros } from './medidas.js'
import { pontuar, type PesosDeCriterio } from './pontuacao.js'

/** Quem está em cada compartimento. Deslocamentos são recalculados na materialização. */
type Lotacao = Map<string, IdJogo[]>

interface Estado {
  readonly lotacao: Lotacao
  readonly naoAlocados: readonly JogoNaoAlocado[]
}

type Movimento = (estado: Estado, contexto: ContextoDeArranjo, gerador: Gerador) => Estado | null

/**
 * Subida de encosta. Sorteia um movimento por iteração e aceita só se a pontuação
 * subir — com uma exceção: alocar um jogo que estava de fora é sempre aceito,
 * porque "caber" é restrição dura e fica fora da pontuação (spec §7.4).
 *
 * A quantidade de jogos posicionados nunca diminui: os movimentos ou a mantêm, ou
 * a aumentam. `trocarComPendente` troca um por outro, o que a preserva.
 *
 * @example melhorar(inicial, contexto, PESOS_PADRAO, geradorMulberry32(42), 20000)
 */
export function melhorar(
  arranjo: Arranjo,
  contexto: ContextoDeArranjo,
  pesos: PesosDeCriterio,
  gerador: Gerador,
  iteracoes: number,
): Arranjo {
  let estado: Estado = {
    lotacao: extrairLotacao(arranjo, contexto),
    naoAlocados: arranjo.naoAlocados,
  }
  let melhor = pontuar(materializar(estado, contexto), contexto, pesos).total

  for (let passo = 0; passo < iteracoes; passo += 1) {
    const candidato = sortearMovimento(estado, contexto, gerador)
    if (candidato === null) continue
    const alocouPendente = candidato.naoAlocados.length < estado.naoAlocados.length
    const pontuacao = pontuar(materializar(candidato, contexto), contexto, pesos).total
    if (alocouPendente || pontuacao > melhor) {
      estado = candidato
      melhor = pontuacao
    }
  }
  const finalizado = materializar(estado, contexto)
  return { ...finalizado, pontuacao: pontuar(finalizado, contexto, pesos) }
}

function extrairLotacao(arranjo: Arranjo, contexto: ContextoDeArranjo): Lotacao {
  const lotacao: Lotacao = new Map(
    contexto.compartimentos.map((compartimento) => [compartimento.id, []]),
  )
  for (const posicao of arranjo.posicoes) {
    lotacao.get(posicao.idCompartimento)?.push(posicao.idJogo)
  }
  return lotacao
}

/** Recalcula deslocamentos e apoios a partir da lotação. */
function materializar(estado: Estado, contexto: ContextoDeArranjo): Arranjo {
  const posicoes: PosicaoDeJogo[] = []
  for (const [idCompartimento, ids] of estado.lotacao) {
    const compartimento = exigirCompartimento(contexto, idCompartimento)
    let deslocamentoXMm: Milimetros = 0
    for (const idJogo of ids) {
      const medidas = exigirJogo(contexto, idJogo).medidas
      const resultado = encaixar(medidas, compartimento)
      if (!resultado.cabe) {
        throw new Error(`lotacao invalida: ${idJogo} em ${idCompartimento}`)
      }
      posicoes.push({ idJogo, idCompartimento, deslocamentoXMm, apoio: resultado.apoio })
      deslocamentoXMm += medidas.espessuraMm
    }
  }
  return { posicoes, naoAlocados: estado.naoAlocados, pontuacao: PONTUACAO_ZERADA }
}

function sortearMovimento(
  estado: Estado,
  contexto: ContextoDeArranjo,
  gerador: Gerador,
): Estado | null {
  const movimentos = movimentosDisponiveis(estado, contexto)
  const movimento = movimentos[sortearIndice(gerador, movimentos.length)]
  return movimento === undefined ? null : movimento(estado, contexto, gerador)
}

function movimentosDisponiveis(estado: Estado, contexto: ContextoDeArranjo): readonly Movimento[] {
  const movimentos: Movimento[] = [moverUmJogo, trocarDoisJogos]
  if (contexto.familias.length > 0) movimentos.push(moverFamilia)
  if (estado.naoAlocados.length > 0) movimentos.push(alocarPendente, trocarComPendente)
  return movimentos
}

function moverUmJogo(estado: Estado, contexto: ContextoDeArranjo, gerador: Gerador): Estado | null {
  const origem = sortearCompartimentoOcupado(estado.lotacao, contexto, gerador)
  if (origem === null) return null
  const destino = sortearIdCompartimento(contexto, gerador)
  if (destino === origem) return null

  const ids = estado.lotacao.get(origem) ?? []
  const idJogo = ids[sortearIndice(gerador, ids.length)]
  if (idJogo === undefined) return null
  if (!podeReceber(destino, [idJogo], estado.lotacao, contexto)) return null

  const lotacao = clonar(estado.lotacao)
  lotacao.set(
    origem,
    (lotacao.get(origem) ?? []).filter((id) => id !== idJogo),
  )
  lotacao.get(destino)?.push(idJogo)
  return { lotacao, naoAlocados: estado.naoAlocados }
}

function trocarDoisJogos(
  estado: Estado,
  contexto: ContextoDeArranjo,
  gerador: Gerador,
): Estado | null {
  const primeiro = sortearCompartimentoOcupado(estado.lotacao, contexto, gerador)
  const segundo = sortearCompartimentoOcupado(estado.lotacao, contexto, gerador)
  if (primeiro === null || segundo === null || primeiro === segundo) return null

  const idsA = estado.lotacao.get(primeiro) ?? []
  const idsB = estado.lotacao.get(segundo) ?? []
  const jogoA = idsA[sortearIndice(gerador, idsA.length)]
  const jogoB = idsB[sortearIndice(gerador, idsB.length)]
  if (jogoA === undefined || jogoB === undefined) return null

  const lotacao = clonar(estado.lotacao)
  lotacao.set(primeiro, [...idsA.filter((id) => id !== jogoA), jogoB])
  lotacao.set(segundo, [...idsB.filter((id) => id !== jogoB), jogoA])
  if (!respeitaLimites(lotacao, contexto)) return null
  return { lotacao, naoAlocados: estado.naoAlocados }
}

function moverFamilia(
  estado: Estado,
  contexto: ContextoDeArranjo,
  gerador: Gerador,
): Estado | null {
  const familia = contexto.familias[sortearIndice(gerador, contexto.familias.length)]
  if (familia === undefined) return null
  const destino = sortearIdCompartimento(contexto, gerador)
  if (!podeReceber(destino, familia.membros, estado.lotacao, contexto, familia.membros)) return null

  const lotacao = clonar(estado.lotacao)
  for (const [id, ids] of lotacao) {
    lotacao.set(
      id,
      ids.filter((idJogo) => !familia.membros.includes(idJogo)),
    )
  }
  lotacao.get(destino)?.push(...familia.membros)
  // Um membro da família podia estar pendente. Sem removê-lo de naoAlocados,
  // o mesmo idJogo apareceria posicionado e recusado ao mesmo tempo.
  return {
    lotacao,
    naoAlocados: estado.naoAlocados.filter((item) => !familia.membros.includes(item.idJogo)),
  }
}

/**
 * Tenta encaixar um jogo que ficou de fora. Existe porque o first-fit inicial pode
 * deixar alguém sem lugar que um rearranjo posterior acomoda — e dizer "não coube"
 * quando cabe é o pior erro que este motor pode cometer.
 */
function alocarPendente(
  estado: Estado,
  contexto: ContextoDeArranjo,
  gerador: Gerador,
): Estado | null {
  const pendente = estado.naoAlocados[sortearIndice(gerador, estado.naoAlocados.length)]
  if (pendente === undefined) return null

  const destino = contexto.compartimentos.find((compartimento) =>
    podeReceber(compartimento.id, [pendente.idJogo], estado.lotacao, contexto),
  )
  if (destino === undefined) return null

  const lotacao = clonar(estado.lotacao)
  lotacao.get(destino.id)?.push(pendente.idJogo)
  return {
    lotacao,
    naoAlocados: estado.naoAlocados.filter((outro) => outro.idJogo !== pendente.idJogo),
  }
}

/**
 * Troca um jogo posicionado por um que ficou de fora. É o único movimento que
 * desaloca alguém, e existe porque sem ele a escolha de quem fica na estante seria
 * decidida pela ordem do first-fit e não pelos critérios: uma coleção que não cabe
 * deixaria de fora um jogo arbitrário em vez do menos jogado (spec §11).
 *
 * Como não muda a quantidade de posicionados, só é aceito se a pontuação subir.
 */
function trocarComPendente(
  estado: Estado,
  contexto: ContextoDeArranjo,
  gerador: Gerador,
): Estado | null {
  const pendente = estado.naoAlocados[sortearIndice(gerador, estado.naoAlocados.length)]
  if (pendente === undefined) return null
  const idCompartimento = sortearCompartimentoOcupado(estado.lotacao, contexto, gerador)
  if (idCompartimento === null) return null

  const ocupantes = estado.lotacao.get(idCompartimento) ?? []
  const desalojado = ocupantes[sortearIndice(gerador, ocupantes.length)]
  if (desalojado === undefined) return null
  if (!podeReceber(idCompartimento, [pendente.idJogo], estado.lotacao, contexto, [desalojado])) {
    return null
  }

  const lotacao = clonar(estado.lotacao)
  lotacao.set(idCompartimento, [...ocupantes.filter((id) => id !== desalojado), pendente.idJogo])

  // diagnosticarNaoAlocado pressupõe que o jogo não cabe em compartimento nenhum.
  // Se o desalojado ainda coubesse em outro lugar, essa troca produziria um
  // "sem-espaco" com faltaMm zero ou negativo para um jogo que na verdade cabe —
  // rejeita em vez de mentir sobre por que ele ficou de fora.
  if (podeSerRealocado(desalojado, lotacao, contexto)) return null

  const naoAlocados = [
    ...estado.naoAlocados.filter((outro) => outro.idJogo !== pendente.idJogo),
    diagnosticarNaoAlocado(
      exigirJogo(contexto, desalojado),
      contexto,
      larguraLivre(lotacao, contexto),
    ),
  ]
  return { lotacao, naoAlocados }
}

/** Existe algum compartimento, na lotação dada, que aceitaria este jogo sozinho? */
function podeSerRealocado(idJogo: IdJogo, lotacao: Lotacao, contexto: ContextoDeArranjo): boolean {
  return contexto.compartimentos.some((compartimento) =>
    podeReceber(compartimento.id, [idJogo], lotacao, contexto),
  )
}

/** Largura ainda livre em cada compartimento, derivada da lotação. */
function larguraLivre(
  lotacao: Lotacao,
  contexto: ContextoDeArranjo,
): ReadonlyMap<string, Milimetros> {
  return new Map(
    contexto.compartimentos.map((compartimento) => [
      compartimento.id,
      compartimento.larguraUtilMm - somar(lotacao.get(compartimento.id) ?? [], contexto),
    ]),
  )
}

/** Verifica dimensões e largura restante, descontando quem sairá do compartimento. */
function podeReceber(
  idCompartimento: string,
  entrantes: readonly IdJogo[],
  lotacao: Lotacao,
  contexto: ContextoDeArranjo,
  saindo: readonly IdJogo[] = [],
): boolean {
  const compartimento = exigirCompartimento(contexto, idCompartimento)
  const cabemDimensionalmente = entrantes.every(
    (id) => encaixar(exigirJogo(contexto, id).medidas, compartimento).cabe,
  )
  if (!cabemDimensionalmente) return false

  const atuais = (lotacao.get(idCompartimento) ?? []).filter((id) => !saindo.includes(id))
  return somar(atuais, contexto) + somar(entrantes, contexto) <= compartimento.larguraUtilMm
}

function respeitaLimites(lotacao: Lotacao, contexto: ContextoDeArranjo): boolean {
  for (const [idCompartimento, ids] of lotacao) {
    const compartimento = exigirCompartimento(contexto, idCompartimento)
    if (somar(ids, contexto) > compartimento.larguraUtilMm) return false
    if (ids.some((id) => !encaixar(exigirJogo(contexto, id).medidas, compartimento).cabe))
      return false
  }
  return true
}

function somar(ids: readonly IdJogo[], contexto: ContextoDeArranjo): Milimetros {
  return ids.reduce((total, id) => total + exigirJogo(contexto, id).medidas.espessuraMm, 0)
}

function clonar(lotacao: Lotacao): Lotacao {
  return new Map([...lotacao].map(([id, ids]) => [id, [...ids]]))
}

function sortearIdCompartimento(contexto: ContextoDeArranjo, gerador: Gerador): string {
  const compartimento =
    contexto.compartimentos[sortearIndice(gerador, contexto.compartimentos.length)]
  if (compartimento === undefined) throw new Error('estante sem compartimentos')
  return compartimento.id
}

function sortearCompartimentoOcupado(
  lotacao: Lotacao,
  contexto: ContextoDeArranjo,
  gerador: Gerador,
): string | null {
  const ocupados = contexto.compartimentos.filter(
    (compartimento) => (lotacao.get(compartimento.id) ?? []).length > 0,
  )
  if (ocupados.length === 0) return null
  return ocupados[sortearIndice(gerador, ocupados.length)]?.id ?? null
}
