import { describe, expect, it } from 'vitest'
import { corDaFamilia } from './corDaFamilia.js'

describe('corDaFamilia', () => {
  it('e deterministico: mesma chave, mesma cor sempre', () => {
    expect(corDaFamilia('catan')).toBe(corDaFamilia('catan'))
  })

  it('produz uma string hsl valida', () => {
    expect(corDaFamilia('azul')).toMatch(/^hsl\(\d+, 65%, 55%\)$/)
  })

  it('chaves diferentes tendem a matizes diferentes', () => {
    expect(corDaFamilia('catan')).not.toBe(corDaFamilia('azul'))
  })

  it('nao lanca com string vazia', () => {
    expect(() => corDaFamilia('')).not.toThrow()
  })
})
