import { describe, expect, it } from 'vitest'
import {
  cmParaMm,
  exigirDistanciaValida,
  exigirMedidaValida,
  exigirMilimetroValido,
  normalizarNome,
  polegadasParaMm,
} from './medidas.js'

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

  it('recusa valor não positivo', () => {
    expect(() => polegadasParaMm(-1)).toThrow(/polegadas/)
  })
})

describe('normalizarNome', () => {
  it('remove acentos, pontuação e caixa', () => {
    expect(normalizarNome('Terra Mystica: Fogo & Gelo')).toBe('terra mystica fogo gelo')
  })

  // Equivalência, não só saída literal: é para casar grafias diferentes que a
  // função existe, e comparar só uma entrada por vez foi o que deixou passar o
  // bug do indicador ordinal (ver os dois testes abaixo, que já eram assim).
  it('casa a grafia com pontuação e a já normalizada', () => {
    expect(normalizarNome('Terra Mystica: Fogo & Gelo')).toBe(
      normalizarNome('terra mystica fogo gelo'),
    )
  })

  it('normaliza edição nacional com acentos', () => {
    expect(normalizarNome('Ora et Labora — Edição Nacional')).toBe('ora et labora edicao nacional')
  })

  it('colapsa espaços repetidos e apara as pontas', () => {
    expect(normalizarNome('  Catan   ')).toBe('catan')
  })

  it('casa a grafia com espaços extras e a já normalizada', () => {
    expect(normalizarNome('  Catan   ')).toBe(normalizarNome('catan'))
  })

  it('casa indicador ordinal com a letra simples equivalente', () => {
    expect(normalizarNome('Descent 2ª Edição')).toBe(normalizarNome('Descent 2a Edicao'))
  })

  it('casa a mesma grafia com e sem acento e pontuação', () => {
    expect(normalizarNome('Ora et Labora — Edição Nacional')).toBe(
      normalizarNome('ora et labora edicao nacional'),
    )
  })
})

describe('exigirMedidaValida', () => {
  it('descreve o campo e o valor ofensor', () => {
    expect(() => exigirMedidaValida(Number.NaN, 'espessuraMm')).toThrow(
      /espessuraMm.*recebido: null/,
    )
  })
})

describe('exigirDistanciaValida', () => {
  it('aceita zero', () => {
    expect(() => exigirDistanciaValida(0, 'alturaDoRodapeMm')).not.toThrow()
  })

  it('recusa negativo citando campo e valor', () => {
    expect(() => exigirDistanciaValida(-5, 'alturaDoRodapeMm')).toThrow(
      /alturaDoRodapeMm.*recebido: -5/,
    )
  })

  it('recusa fracao, mesmo positiva', () => {
    expect(() => exigirDistanciaValida(0.5, 'alturaDoRodapeMm')).toThrow(
      /alturaDoRodapeMm.*recebido: 0.5/,
    )
  })
})

describe('exigirMilimetroValido', () => {
  it('aceita inteiro positivo', () => {
    expect(() => exigirMilimetroValido(295, 'maiorMm')).not.toThrow()
  })

  it('recusa fracao, mesmo positiva, citando campo e valor', () => {
    expect(() => exigirMilimetroValido(295.5, 'maiorMm')).toThrow(/maiorMm.*recebido: 295.5/)
  })

  it('recusa zero e negativo, herdando de exigirMedidaValida', () => {
    expect(() => exigirMilimetroValido(0, 'maiorMm')).toThrow(/maiorMm/)
    expect(() => exigirMilimetroValido(-10, 'maiorMm')).toThrow(/maiorMm/)
  })
})
