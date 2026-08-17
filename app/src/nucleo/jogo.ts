import { exigirMilimetroValido, type Milimetros } from './medidas.js'

export type IdJogo = string

/** De onde veio a medida. Existe porque a cobertura é irregular (spec §6.1). */
export type OrigemDaMedida =
  | { readonly tipo: 'manual' }
  | { readonly tipo: 'semeada'; readonly chaveDoTemplate: string }
  | { readonly tipo: 'planilha'; readonly arquivo: string; readonly linha: number }
  | { readonly tipo: 'bgg'; readonly idVersao: number; readonly obtidoEm: string }

export interface MedidasDaCaixa {
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly origem: OrigemDaMedida
  readonly confirmadaPeloUsuario: boolean
}

/** `desconhecida` é distinto de zero partidas: um é ausência de dado, o outro é dado. */
export type SinalDeFrequencia =
  | { readonly tipo: 'desconhecida' }
  | { readonly tipo: 'partidas'; readonly quantidade: number }
  | { readonly tipo: 'destaque'; readonly marcadoPeloUsuario: true }

export interface CaixaDeJogo {
  readonly id: IdJogo
  readonly nome: string
  readonly medidas: MedidasDaCaixa
  readonly idJogoBase: IdJogo | null
  readonly frequencia: SinalDeFrequencia
  readonly idLudopedia: number | null
  readonly idBgg: number | null
}

/** Marcar destaque é declaração de prioridade, não estatística (spec S5). */
export const PESO_DE_DESTAQUE = 20

/**
 * Única porta de entrada de medidas: garante `maiorMm >= menorMm`, invariante do
 * qual todo o cálculo de encaixe depende.
 *
 * @example criarMedidas(220, 300, 60, { tipo: 'manual' }, true).maiorMm // 300
 */
export function criarMedidas(
  ladoA: Milimetros,
  ladoB: Milimetros,
  espessuraMm: Milimetros,
  origem: OrigemDaMedida,
  confirmadaPeloUsuario: boolean,
): MedidasDaCaixa {
  exigirMilimetroValido(ladoA, 'ladoA')
  exigirMilimetroValido(ladoB, 'ladoB')
  exigirMilimetroValido(espessuraMm, 'espessuraMm')
  return {
    maiorMm: Math.max(ladoA, ladoB),
    menorMm: Math.min(ladoA, ladoB),
    espessuraMm,
    origem,
    confirmadaPeloUsuario,
  }
}

/**
 * Converte o sinal de frequência no número que a pontuação usa.
 *
 * Valida `quantidade` porque ela vem de CSV e da API da Ludopedia: `NaN` ou
 * `Infinity` aqui viram `NaN` no total da pontuação, e aí toda comparação da busca
 * local devolve `false` — o otimizador para de melhorar sem acusar nada.
 *
 * @example pesoDeFrequencia({ tipo: 'partidas', quantidade: 12 }) // 12
 */
export function pesoDeFrequencia(sinal: SinalDeFrequencia): number {
  switch (sinal.tipo) {
    case 'desconhecida':
      return 0
    case 'partidas':
      return exigirQuantidadeValida(sinal.quantidade)
    case 'destaque':
      return PESO_DE_DESTAQUE
  }
}

function exigirQuantidadeValida(quantidade: number): number {
  if (!Number.isFinite(quantidade) || quantidade < 0) {
    throw new RangeError(
      `quantidade de partidas deve ser um número finito não negativo; ` +
        `recebido: ${JSON.stringify(quantidade)}`,
    )
  }
  return quantidade
}
