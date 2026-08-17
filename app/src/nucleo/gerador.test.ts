import { describe, expect, it } from 'vitest'
import { GeradorFixo, geradorMulberry32, sortearIndice, type Gerador } from './gerador.js'

describe('geradorMulberry32', () => {
  it('produz a mesma sequencia para a mesma semente', () => {
    const geradorA = geradorMulberry32(42)
    const geradorB = geradorMulberry32(42)
    expect([geradorA.proximo(), geradorA.proximo()]).toEqual([
      geradorB.proximo(),
      geradorB.proximo(),
    ])
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

  it('recusa valor da sequencia fora de [0, 1), citando o indice', () => {
    expect(() => new GeradorFixo([0.5, -0.1])).toThrow(/sequencia\[1\].*recebido: -0.1/)
    expect(() => new GeradorFixo([1])).toThrow(/sequencia\[0\].*recebido: 1/)
  })

  it('copia a sequencia: mutar o array original nao afeta o dublê já construído', () => {
    const original = [0.1, 0.2]
    const gerador = new GeradorFixo(original)
    original[0] = 0.9
    expect(gerador.proximo()).toBe(0.1)
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

  it('recusa tamanho fracionario', () => {
    expect(() => sortearIndice(new GeradorFixo([0.5]), 2.5)).toThrow(/recebido: 2.5/)
  })

  // Um Gerador mal implementado (ex.: adaptador futuro lendo fixtures gravadas)
  // poderia devolver algo fora de [0, 1) sem que sortearIndice percebesse, e o
  // indice resultante ficaria fora de [0, tamanho) em silencio.
  it('recusa quando o gerador devolve valor fora de [0, 1)', () => {
    const geradorRuim: Gerador = { proximo: () => 1.5 }
    expect(() => sortearIndice(geradorRuim, 5)).toThrow(/gerador\.proximo\(\).*recebido: 1.5/)
  })

  it('recusa quando o gerador devolve negativo', () => {
    const geradorRuim: Gerador = { proximo: () => -0.5 }
    expect(() => sortearIndice(geradorRuim, 5)).toThrow(/gerador\.proximo\(\).*recebido: -0.5/)
  })
})
