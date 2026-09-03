import { describe, expect, it } from 'vitest'
import { detectarDelimitador, parsearCsv } from './leitorCsv.js'

describe('detectarDelimitador', () => {
  it('detecta virgula como delimitador padrao', () => {
    expect(detectarDelimitador('Nome,Largura,Profundidade\nCatan,295,220')).toBe(',')
  })

  it('detecta ponto-e-virgula quando dominante', () => {
    expect(detectarDelimitador('Nome;Largura;Profundidade\nCatan;295;220')).toBe(';')
  })

  it('ignora delimitadores contidos dentro de aspas', () => {
    expect(detectarDelimitador('Nome;Comentario\n"Catan, 2a Ed.";Top')).toBe(';')
  })
})

describe('parsearCsv', () => {
  it('remove UTF-8 BOM do inicio do arquivo', () => {
    const csv = '\uFEFFNome,Largura\nCatan,295'
    const resultado = parsearCsv(csv)
    expect(resultado.cabecalhos).toEqual(['Nome', 'Largura'])
    expect(resultado.linhas).toHaveLength(1)
    expect(resultado.linhas[0]).toEqual({ Nome: 'Catan', Largura: '295' })
  })

  it('suporta delimitador ponto-e-virgula', () => {
    const csv = 'Nome;Largura;Espessura\nAzul;295;72'
    const resultado = parsearCsv(csv)
    expect(resultado.cabecalhos).toEqual(['Nome', 'Largura', 'Espessura'])
    expect(resultado.linhas[0]).toEqual({ Nome: 'Azul', Largura: '295', Espessura: '72' })
  })

  it('suporta campos entre aspas contendo delimitador e quebras de linha', () => {
    const csv = 'Nome,Descricao\n"Terraforming Mars, O Jogo","Edicao\nNacional"'
    const resultado = parsearCsv(csv)
    expect(resultado.linhas[0]).toEqual({
      Nome: 'Terraforming Mars, O Jogo',
      Descricao: 'Edicao\nNacional',
    })
  })

  it('trata aspas duplas escapadas via duas aspas duplas ("")', () => {
    const csv = 'Nome,Info\n"Catan ""Plus""",Novo'
    const resultado = parsearCsv(csv)
    expect(resultado.linhas[0]?.Nome).toBe('Catan "Plus"')
  })

  it('ignora linhas em branco no final', () => {
    const csv = 'Nome,Lado\nCatan,295\n\n   \n'
    const resultado = parsearCsv(csv)
    expect(resultado.linhas).toHaveLength(1)
  })

  it('retorna linhas com numero da linha original para rastreabilidade', () => {
    const csv = 'Nome,Lado\nCatan,295\nDixit,280'
    const resultado = parsearCsv(csv)
    expect(resultado.registros[0]?.numeroDaLinha).toBe(2)
    expect(resultado.registros[1]?.numeroDaLinha).toBe(3)
  })
})
