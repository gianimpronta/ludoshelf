import { describe, expect, it } from 'vitest'
import { GeradorFixo, geradorMulberry32, sortearIndice } from './gerador.js'

describe('geradorMulberry32', () => {
  it('produz a mesma sequencia para a mesma semente', () => {
    const a = geradorMulberry32(42)
    const b = geradorMulberry32(42)
    expect([a.proximo(), a.proximo()]).toEqual([b.proximo(), b.proximo()])
  })

  it('produz sequencias diferentes para sementes diferentes', () => {
    expect(geradorMulberry32(1).proximo()).not.toBe(geradorMulberry32(2).proximo())
  })

  it('mantem os valores dentro de [0, 1)', () => {
    const gerador = geradorMulberry32(7)
    for (let i = 0; i < 200; i += 1) {
      const valor = gerador.proximo()
      expect(valor).toBeGreaterThanOrEqual(0)
      expect(valor).toBeLessThan(1)
    }
  })
})

describe('GeradorFixo', () => {
  it('devolve a sequencia informada e depois recomeca', () => {
    const gerador = new GeradorFixo([0.1, 0.9])
    expect([gerador.proximo(), gerador.proximo(), gerador.proximo()]).toEqual([0.1, 0.9, 0.1])
  })

  it('recusa sequencia vazia', () => {
    expect(() => new GeradorFixo([])).toThrow(/recebido: \[\]/)
  })
})

describe('sortearIndice', () => {
  it('mapeia o sorteio para um indice valido', () => {
    expect(sortearIndice(new GeradorFixo([0.0]), 5)).toBe(0)
    expect(sortearIndice(new GeradorFixo([0.999]), 5)).toBe(4)
  })

  it('recusa tamanho nao positivo', () => {
    expect(() => sortearIndice(new GeradorFixo([0.5]), 0)).toThrow(/recebido: 0/)
  })
})
