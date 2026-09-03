import { describe, expect, it } from 'vitest'
import { normalizarNome } from '../nucleo/medidas.js'
import { sanitizarNome } from './sanitizarNome.js'

describe('sanitizarNome', () => {
  it('remove simbolo trademark (™) para casar com nome normalizado', () => {
    const nomeLimpo = sanitizarNome('Catan™')
    expect(nomeLimpo).toBe('Catan')
    expect(normalizarNome(nomeLimpo)).toBe(normalizarNome('Catan'))
  })

  it('remove outros simbolos como marcas registradas e copyrights', () => {
    expect(sanitizarNome('Ticket to Ride®')).toBe('Ticket to Ride')
    expect(sanitizarNome('Pandemic©')).toBe('Pandemic')
  })

  it('lanca erro ao receber string vazia ou puramente pontuacao/simbolos', () => {
    expect(() => sanitizarNome('')).toThrow(RangeError)
    expect(() => sanitizarNome('   ')).toThrow(RangeError)
    expect(() => sanitizarNome('---')).toThrow(RangeError)
    expect(() => sanitizarNome('™®©')).toThrow(RangeError)
  })

  it('preserva acentuacoes e caracteres alfanumericos', () => {
    expect(sanitizarNome('Descent 2ª Edição')).toBe('Descent 2ª Edição')
  })
})
