import { describe, expect, it } from 'vitest'
import { parsearCsv } from './leitorCsv.js'
import { gerarTemplateCsv } from './templateCsv.js'

describe('gerarTemplateCsv', () => {
  it('gera CSV com BOM UTF-8 e colunas recomendadas', () => {
    const csv = gerarTemplateCsv()
    expect(csv.startsWith('\uFEFF')).toBe(true)

    const parseado = parsearCsv(csv)
    expect(parseado.cabecalhos).toContain('Nome')
    expect(parseado.cabecalhos).toContain('Comprimento (mm)')
    expect(parseado.cabecalhos).toContain('Largura (mm)')
    expect(parseado.cabecalhos).toContain('Espessura (mm)')
    expect(parseado.cabecalhos).toContain('Jogo-Base')
    expect(parseado.cabecalhos).toContain('Partidas')
    expect(parseado.linhas.length).toBeGreaterThan(0)
  })
})
