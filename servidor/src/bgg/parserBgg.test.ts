import { describe, expect, it } from 'vitest'
import { converterPolegadasParaMm, interpretarXmlDoJogoBgg } from './parserBgg.js'

describe('parserBgg', () => {
  it('converte polegadas em milimetros com arredondamento correto', () => {
    expect(converterPolegadasParaMm(11.6)).toBe(295)
    expect(converterPolegadasParaMm(2.8)).toBe(71)
    expect(converterPolegadasParaMm(1.0)).toBe(25)
  })

  it('interpreta xml do BGG com versoes fisicas e ordena dimensoes decrescente', () => {
    const xmlMock = `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="13">
    <name type="primary" sortindex="1" value="Catan" />
    <yearpublished value="1995" />
    <link type="boardgameversion" id="1001" value="Portuguese Edition" />
    <link type="boardgameversion" id="1002" value="German Edition" />
  </item>
  <item type="boardgameversion" id="1001">
    <name type="primary" value="Edição Brasileira (Devir)" />
    <yearpublished value="2020" />
    <length value="11.6" />
    <width value="11.6" />
    <depth value="2.8" />
    <link type="boardgamepublisher" id="100" value="Devir" />
    <link type="language" id="50" value="Portuguese" />
  </item>
  <item type="boardgameversion" id="1002">
    <name type="primary" value="German Edition (Kosmos)" />
    <yearpublished value="1995" />
    <length value="0" />
    <width value="0" />
    <depth value="0" />
  </item>
</items>`

    const resultado = interpretarXmlDoJogoBgg(xmlMock)
    expect(resultado).not.toBeNull()
    expect(resultado?.idBgg).toBe(13)
    expect(resultado?.nome).toBe('Catan')
    expect(resultado?.anoLancamento).toBe(1995)

    // Versão 1002 foi filtrada por ter medidas 0x0x0
    expect(resultado?.versoes).toHaveLength(1)
    const versao = resultado!.versoes[0]
    expect(versao).toBeDefined()
    if (!versao) throw new Error('versao indefinida')
    expect(versao.idVersao).toBe(1001)
    expect(versao.nomeVersao).toBe('Edição Brasileira (Devir)')
    expect(versao.editora).toBe('Devir')
    expect(versao.idioma).toBe('Portuguese')
    expect(versao.ano).toBe(2020)
    expect(versao.maiorMm).toBe(295)
    expect(versao.menorMm).toBe(295)
    expect(versao.espessuraMm).toBe(71)
  })

  it('retorna null para xml invalido ou vazio', () => {
    expect(interpretarXmlDoJogoBgg('')).toBeNull()
    expect(interpretarXmlDoJogoBgg('<items></items>')).toBeNull()
  })
})
