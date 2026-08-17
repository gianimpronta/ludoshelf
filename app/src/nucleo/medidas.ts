/** Toda medida do domínio é milímetro inteiro (spec §4, D9). */
export type Milimetros = number

const MM_POR_CM = 10
const MM_POR_POLEGADA = 25.4

/**
 * Falha se o valor não puder ser uma medida física.
 *
 * @example exigirMedidaValida(295, 'maiorMm')
 */
export function exigirMedidaValida(valor: number, campo: string): void {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new RangeError(
      `${campo} deve ser um número finito maior que zero; recebido: ${JSON.stringify(valor)}`,
    )
  }
}

/**
 * Converte centímetros para milímetros inteiros. Arredonda de propósito: o inteiro
 * é a garantia contra o falso "cabe por 0,2 mm".
 *
 * @example cmParaMm(29.5) // 295
 */
export function cmParaMm(centimetros: number): Milimetros {
  exigirMedidaValida(centimetros, 'centimetros')
  return Math.round(centimetros * MM_POR_CM)
}

/**
 * Converte polegadas para milímetros inteiros. O BGG devolve medidas em polegadas.
 *
 * @example polegadasParaMm(11.61) // 295
 */
export function polegadasParaMm(polegadas: number): Milimetros {
  exigirMedidaValida(polegadas, 'polegadas')
  return Math.round(polegadas * MM_POR_POLEGADA)
}

/**
 * Forma canônica de um nome para casamento entre fontes (spec S6): minúsculas,
 * sem acentos, sem pontuação, espaços colapsados.
 *
 * @example normalizarNome('Terra Mystica: Fogo & Gelo') // 'terra mystica fogo gelo'
 */
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
}
