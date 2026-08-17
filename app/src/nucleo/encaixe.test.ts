import { describe, expect, it } from 'vitest'
import { encaixar } from './encaixe.js'
import { criarMedidas } from './jogo.js'
import type { Compartimento } from './estante.js'

const prateleira = (alturaUtilMm: number, profundidadeUtilMm = 320): Compartimento => ({
  id: 'c1',
  larguraUtilMm: 760,
  alturaUtilMm,
  profundidadeUtilMm,
  alturaDaBaseMm: 400,
})

const manual = { tipo: 'manual' } as const

describe('encaixar', () => {
  it('usa retrato quando a maior dimensao cabe na altura', () => {
    const medidas = criarMedidas(295, 295, 72, manual, true)
    expect(encaixar(medidas, prateleira(350))).toEqual({ cabe: true, apoio: 'retrato' })
  })

  it('vira para paisagem quando retrato nao cabe na altura mas paisagem cabe', () => {
    // Caso da spec §11: 300x220x60 numa prateleira de 250 mm de altura.
    const medidas = criarMedidas(300, 220, 60, manual, true)
    expect(encaixar(medidas, prateleira(250))).toEqual({ cabe: true, apoio: 'paisagem' })
  })

  it('prefere retrato mesmo quando paisagem tambem caberia', () => {
    const medidas = criarMedidas(300, 220, 60, manual, true)
    expect(encaixar(medidas, prateleira(400))).toEqual({ cabe: true, apoio: 'retrato' })
  })

  it('recusa por largura quando a espessura excede a prateleira', () => {
    const medidas = criarMedidas(295, 295, 800, manual, true)
    expect(encaixar(medidas, prateleira(350))).toEqual({
      cabe: false,
      motivo: 'largo-demais',
      faltaMm: 40,
    })
  })

  it('recusa por altura quando nem a menor dimensao cabe em pe', () => {
    const medidas = criarMedidas(400, 300, 70, manual, true)
    expect(encaixar(medidas, prateleira(250))).toEqual({
      cabe: false,
      motivo: 'alto-demais',
      faltaMm: 50,
    })
  })

  it('recusa por profundidade quando so a paisagem caberia mas a caixa e funda', () => {
    const medidas = criarMedidas(300, 220, 60, manual, true)
    expect(encaixar(medidas, prateleira(250, 280))).toEqual({
      cabe: false,
      motivo: 'fundo-demais',
      faltaMm: 20,
    })
  })

  it('recusa por profundidade quando a caixa cabe em altura mas nao no fundo', () => {
    // Ambas as poses cabem na altura de 400; nenhuma cabe na profundidade de 200.
    const medidas = criarMedidas(300, 220, 60, manual, true)
    expect(encaixar(medidas, prateleira(400, 200))).toEqual({
      cabe: false,
      motivo: 'fundo-demais',
      faltaMm: 20,
    })
  })
})
