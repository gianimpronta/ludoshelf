/**
 * Fonte de aleatoriedade da busca local. É injetada, e nunca `Math.random`, porque
 * sem repetibilidade não há como afirmar que uma mudança melhorou o arranjo.
 */
export interface Gerador {
  /** Próximo número em [0, 1). */
  proximo(): number
}

/**
 * mulberry32: PRNG determinístico de 32 bits, curto e de qualidade suficiente para
 * busca local. Não serve para criptografia.
 *
 * @example geradorMulberry32(42).proximo()
 */
export function geradorMulberry32(semente: number): Gerador {
  let estado = semente >>> 0
  return {
    proximo(): number {
      estado = (estado + 0x6d2b79f5) >>> 0
      let valor = estado
      valor = Math.imul(valor ^ (valor >>> 15), valor | 1)
      valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61)
      return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296
    },
  }
}

/** Dublê nomeado para testes: repete ciclicamente a sequência informada. */
export class GeradorFixo implements Gerador {
  private indice = 0
  private readonly sequencia: readonly number[]

  constructor(sequencia: readonly number[]) {
    if (sequencia.length === 0) {
      throw new RangeError('GeradorFixo precisa de ao menos um valor; recebido: []')
    }
    sequencia.forEach((valor, indice) => exigirFracaoValida(valor, `sequencia[${indice}]`))
    // Copia para que mutar o array original depois de construir o dublê não
    // altere silenciosamente a sequência que um teste já em execução espera usar.
    this.sequencia = [...sequencia]
  }

  proximo(): number {
    // O módulo mantém o índice sempre dentro da sequência, que o construtor já
    // garantiu não ser vazia — daí a asserção ser segura.
    const valor = this.sequencia[this.indice % this.sequencia.length] as number
    this.indice += 1
    return valor
  }
}

/** Falha se o valor não puder vir de `Gerador.proximo()`: precisa estar em [0, 1). */
function exigirFracaoValida(valor: number, campo: string): void {
  if (!Number.isFinite(valor) || valor < 0 || valor >= 1) {
    throw new RangeError(`${campo} deve estar em [0, 1); recebido: ${JSON.stringify(valor)}`)
  }
}

/**
 * Sorteia um índice em [0, tamanho). Valida o valor devolvido pelo gerador, e não
 * só o próprio `tamanho`: um `Gerador` mal implementado (por exemplo, um adaptador
 * futuro lendo fixtures gravadas) que devolvesse algo fora de [0, 1) produziria um
 * índice fora de `[0, tamanho)` sem erro nenhum, e o acesso ao array devolveria
 * `undefined` silenciosamente lá na frente.
 *
 * @example sortearIndice(gerador, 5) // 0..4
 */
export function sortearIndice(gerador: Gerador, tamanho: number): number {
  if (!Number.isInteger(tamanho) || tamanho <= 0) {
    throw new RangeError(`tamanho deve ser um número inteiro maior que zero; recebido: ${tamanho}`)
  }
  const valor = gerador.proximo()
  exigirFracaoValida(valor, 'gerador.proximo()')
  return Math.min(tamanho - 1, Math.floor(valor * tamanho))
}
