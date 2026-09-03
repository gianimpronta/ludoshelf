/**
 * Remove símbolos de marca e símbolos gráficos (\p{So}) que causariam
 * falhas na decomposição NFKD (como ™ virando "tm") e valida que o
 * nome não se reduz a uma string vazia.
 */
export function sanitizarNome(nomeBruto: string): string {
  const nomeLimpo = nomeBruto
    .replace(/[\u2122\u00AE\u00A9]/gu, '') // ™, ®, ©
    .replace(/\p{So}/gu, '')
    .trim()

  const testeAlfanumerico = nomeLimpo.replace(/[^\p{Letter}\p{Number}]+/gu, '').trim()
  if (testeAlfanumerico.length === 0) {
    throw new RangeError(`Nome de jogo inválido ou vazio; recebido: ${JSON.stringify(nomeBruto)}`)
  }

  return nomeLimpo
}
