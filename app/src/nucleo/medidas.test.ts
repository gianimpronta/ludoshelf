import { describe, expect, it } from 'vitest'
import { cmParaMm, exigirMedidaValida, normalizarNome, polegadasParaMm } from './medidas.js'

describe('cmParaMm', () => {
  it('converte centímetros para milímetros inteiros', () => {
    expect(cmParaMm(29.5)).toBe(295)
  })

  it('arredonda em vez de truncar', () => {
    expect(cmParaMm(7.26)).toBe(73)
  })

  it('recusa valor não positivo dizendo o valor recebido', () => {
    expect(() => cmParaMm(0)).toThrow(/recebido: 0/)
  })
})

describe('polegadasParaMm', () => {
  it('converte polegadas do BGG para milímetros', () => {
    expect(polegadasParaMm(11.61)).toBe(295)
  })
})

describe('normalizarNome', () => {
  it('remove acentos, pontuação e caixa', () => {
    expect(normalizarNome('Terra Mystica: Fogo & Gelo')).toBe('terra mystica fogo gelo')
  })

  it('normaliza edição nacional com acentos', () => {
    expect(normalizarNome('Ora et Labora — Edição Nacional')).toBe('ora et labora edicao nacional')
  })

  it('colapsa espaços repetidos e apara as pontas', () => {
    expect(normalizarNome('  Catan   ')).toBe('catan')
  })
})

describe('exigirMedidaValida', () => {
  it('descreve o campo e o valor ofensor', () => {
    expect(() => exigirMedidaValida(Number.NaN, 'espessuraMm')).toThrow(
      /espessuraMm.*recebido: null/,
    )
  })
})
