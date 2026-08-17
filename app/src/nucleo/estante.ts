import { exigirDistanciaValida, exigirMilimetroValido, type Milimetros } from './medidas.js'

/**
 * Um espaço fechado onde caixas podem ser postas. Prateleira corrida é o caso em que
 * cada compartimento ocupa a largura inteira; nichos tipo Kallax, quando chegarem,
 * são apenas compartimentos menores. O motor não distingue os dois (spec §6.2).
 */
export interface Compartimento {
  readonly id: string
  readonly larguraUtilMm: Milimetros
  readonly alturaUtilMm: Milimetros
  readonly profundidadeUtilMm: Milimetros
  /** Do chão até a base deste compartimento. Alimenta o critério "altura dos olhos". */
  readonly alturaDaBaseMm: Milimetros
}

export interface Estante {
  readonly id: string
  readonly nome: string
  readonly alturaDoRodapeMm: Milimetros
  readonly espessuraDaPrateleiraMm: Milimetros
  readonly compartimentos: readonly Compartimento[]
}

/** O que a tela de Estantes coleta do usuário. */
export interface DefinicaoDeEstante {
  readonly nome: string
  readonly larguraUtilMm: Milimetros
  readonly profundidadeUtilMm: Milimetros
  readonly alturaDoRodapeMm: Milimetros
  readonly espessuraDaPrateleiraMm: Milimetros
  /** Alturas livres de baixo para cima. */
  readonly alturasLivresMm: readonly Milimetros[]
}

/**
 * Deriva os compartimentos acumulando a altura da base de baixo para cima:
 * base[0] = rodapé; base[i] = base[i-1] + altura livre[i-1] + espessura da prateleira.
 *
 * @example montarEstante('e1', def).compartimentos[1].alturaDaBaseMm // 448
 */
export function montarEstante(id: string, definicao: DefinicaoDeEstante): Estante {
  if (definicao.alturasLivresMm.length === 0) {
    throw new RangeError(
      `estante "${definicao.nome}" precisa de ao menos uma prateleira; ` +
        `recebido alturasLivresMm: []`,
    )
  }
  validarDefinicao(definicao)
  return {
    id,
    nome: definicao.nome,
    alturaDoRodapeMm: definicao.alturaDoRodapeMm,
    espessuraDaPrateleiraMm: definicao.espessuraDaPrateleiraMm,
    compartimentos: derivarCompartimentos(id, definicao),
  }
}

/**
 * Valida na entrada porque `alturaDaBaseMm` é um acumulador: um valor inválido em
 * qualquer prateleira se propaga para todas as de cima, e o sintoma só apareceria
 * lá na frente, no critério "altura dos olhos", longe da causa.
 */
function validarDefinicao(definicao: DefinicaoDeEstante): void {
  exigirMilimetroValido(definicao.larguraUtilMm, 'larguraUtilMm')
  exigirMilimetroValido(definicao.profundidadeUtilMm, 'profundidadeUtilMm')
  exigirDistanciaValida(definicao.alturaDoRodapeMm, 'alturaDoRodapeMm')
  // A espessura da prateleira, diferente do rodapé, não aceita zero: uma
  // prateleira física sempre ocupa algum espaço, e é ela quem separa um
  // compartimento do de cima na acumulação de alturaDaBaseMm.
  exigirMilimetroValido(definicao.espessuraDaPrateleiraMm, 'espessuraDaPrateleiraMm')
  definicao.alturasLivresMm.forEach((altura, indice) =>
    exigirMilimetroValido(altura, `alturasLivresMm[${indice}]`),
  )
}

function derivarCompartimentos(
  idEstante: string,
  definicao: DefinicaoDeEstante,
): readonly Compartimento[] {
  const compartimentos: Compartimento[] = []
  let alturaDaBaseMm = definicao.alturaDoRodapeMm
  for (const [indice, alturaUtilMm] of definicao.alturasLivresMm.entries()) {
    compartimentos.push({
      id: `${idEstante}-p${indice}`,
      larguraUtilMm: definicao.larguraUtilMm,
      alturaUtilMm,
      profundidadeUtilMm: definicao.profundidadeUtilMm,
      alturaDaBaseMm,
    })
    alturaDaBaseMm += alturaUtilMm + definicao.espessuraDaPrateleiraMm
  }
  return compartimentos
}
