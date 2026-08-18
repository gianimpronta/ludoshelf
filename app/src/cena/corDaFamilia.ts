/**
 * Cor por família, derivada por hash da chave — sem paleta fixa cadastrada
 * (spec S1). Mesma chave sempre produz a mesma cor; chaves diferentes tendem a
 * cair em matizes visualmente distintos.
 *
 * @example corDaFamilia('catan') // 'hsl(214, 65%, 55%)'
 */
export function corDaFamilia(chave: string): string {
  let hash = 0
  for (let indice = 0; indice < chave.length; indice += 1) {
    hash = (hash << 5) - hash + chave.charCodeAt(indice)
    hash |= 0
  }
  const matiz = Math.abs(hash) % 360
  return `hsl(${matiz}, 65%, 55%)`
}
