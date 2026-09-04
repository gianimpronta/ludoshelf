import { XMLParser } from 'fast-xml-parser'
import type { JogoBgg, VersaoBgg } from './tipos.js'

export function converterPolegadasParaMm(polegadas: number): number {
  return Math.round(polegadas * 25.4)
}

function extrairValor(campo: any): string | undefined {
  if (!campo) return undefined
  if (typeof campo === 'object' && '@_value' in campo) {
    return String(campo['@_value'])
  }
  return typeof campo === 'string' ? campo : undefined
}

function extrairLinks(item: any, tipo: string): string[] {
  if (!item.link) return []
  const links = Array.isArray(item.link) ? item.link : [item.link]
  return links
    .filter((l: any) => l['@_type'] === tipo)
    .map((l: any) => l['@_value'])
    .filter(Boolean)
}

export function interpretarXmlDoJogoBgg(xml: string): JogoBgg | null {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['item', 'name', 'link'].includes(name),
  })

  const resultado = parser.parse(xml)
  const itens = resultado?.items?.item
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return null
  }

  // O primeiro item do tipo boardgame é o jogo principal
  const itemJogo = itens.find((it: any) => it['@_type'] === 'boardgame') || itens[0]
  const idBgg = parseInt(itemJogo['@_id'], 10)
  if (Number.isNaN(idBgg)) return null

  // Nome principal
  const nomes = Array.isArray(itemJogo.name) ? itemJogo.name : [itemJogo.name]
  const nomePrincipal =
    nomes.find((n: any) => n['@_type'] === 'primary')?.['@_value'] ||
    nomes[0]?.['@_value'] ||
    'Jogo Desconhecido'

  const ano = parseInt(extrairValor(itemJogo.yearpublished) || '', 10)

  // Extrair versões físicas
  const versoes: VersaoBgg[] = []

  // As versões podem vir como itens do tipo 'boardgameversion'
  const itensVersao = itens.filter((it: any) => it['@_type'] === 'boardgameversion')

  for (const v of itensVersao) {
    const idVersao = parseInt(v['@_id'], 10)
    if (Number.isNaN(idVersao)) continue

    const nomesV = Array.isArray(v.name) ? v.name : [v.name]
    const nomeVersao =
      nomesV.find((n: any) => n['@_type'] === 'primary')?.['@_value'] ||
      nomesV[0]?.['@_value'] ||
      `Versão #${idVersao}`

    const anoV = parseInt(extrairValor(v.yearpublished) || '', 10)

    const lenIn = parseFloat(extrairValor(v.length) || '0')
    const widIn = parseFloat(extrairValor(v.width) || '0')
    const depIn = parseFloat(extrairValor(v.depth) || '0')

    // Se não tiver medidas cadastradas nesta versão, ignora ou pula se tudo for zero
    if (lenIn <= 0 && widIn <= 0 && depIn <= 0) {
      continue
    }

    const dimsMm = [
      converterPolegadasParaMm(lenIn),
      converterPolegadasParaMm(widIn),
      converterPolegadasParaMm(depIn),
    ].sort((a, b) => b - a)

    const maiorMm = dimsMm[0] ?? 0
    const menorMm = dimsMm[1] ?? 0
    const espessuraMm = dimsMm[2] ?? 0

    const editoras = extrairLinks(v, 'boardgamepublisher')
    const idiomas = extrairLinks(v, 'language')

    versoes.push({
      idVersao,
      nomeVersao,
      editora: editoras[0],
      idioma: idiomas[0],
      ano: Number.isNaN(anoV) ? undefined : anoV,
      maiorMm,
      menorMm,
      espessuraMm,
    })
  }

  return {
    idBgg,
    nome: nomePrincipal,
    anoLancamento: Number.isNaN(ano) ? undefined : ano,
    versoes,
  }
}
