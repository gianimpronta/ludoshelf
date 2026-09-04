import type { Milimetros } from '../nucleo/medidas.js'
import type {
  CatalogoDeJogos,
  CriteriosBuscaCatalogo,
  FormatoPadrao,
  ResultadoBuscaCatalogo,
  VersaoDoJogo,
} from './CatalogoDeJogos.js'
import { CatalogoSemeado } from './CatalogoSemeado.js'

export class CatalogoHttp implements CatalogoDeJogos {
  private readonly baseUrl: string
  private readonly fallback: CatalogoDeJogos
  private readonly fetcher: typeof fetch

  constructor(
    baseUrl = '/api',
    fallback?: CatalogoDeJogos,
    fetcher: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {
    this.baseUrl = baseUrl
    this.fallback = fallback ?? new CatalogoSemeado()
    this.fetcher = fetcher
  }

  async buscar(criterios: CriteriosBuscaCatalogo): Promise<ResultadoBuscaCatalogo | null> {
    try {
      const params = new URLSearchParams()
      if (criterios.idBgg) params.set('idBgg', String(criterios.idBgg))
      if (criterios.idLudopedia) params.set('idLudopedia', String(criterios.idLudopedia))
      if (criterios.nome) params.set('q', criterios.nome)

      const resposta = await this.fetcher(`${this.baseUrl}/jogos/buscar?${params.toString()}`)
      if (!resposta.ok) {
        return this.fallback.buscar(criterios)
      }

      const dados = await resposta.json()
      const jogo = dados?.jogos?.[0]
      if (!jogo) {
        return this.fallback.buscar(criterios)
      }

      const versaoPrincipal = jogo.versoes?.[0]
      if (!versaoPrincipal) {
        return this.fallback.buscar(criterios)
      }

      return {
        maiorMm: versaoPrincipal.maiorMm as Milimetros,
        menorMm: versaoPrincipal.menorMm as Milimetros,
        espessuraMm: versaoPrincipal.espessuraMm as Milimetros,
        fonte: versaoPrincipal.fonte || 'catalogo-central',
        idBgg: jogo.idBgg,
        idLudopedia: jogo.idLudopedia,
        versoes: (jogo.versoes || []).map((v: any) => ({
          id: v.id,
          idBggVersao: v.idBggVersao,
          nomeVersao: v.nomeVersao,
          editora: v.editora,
          idioma: v.idioma,
          ano: v.ano,
          maiorMm: v.maiorMm as Milimetros,
          menorMm: v.menorMm as Milimetros,
          espessuraMm: v.espessuraMm as Milimetros,
          confirmada: v.confirmada,
          fonte: v.fonte,
        })),
      }
    } catch {
      return this.fallback.buscar(criterios)
    }
  }

  async buscarPorNome(nome: string): Promise<ResultadoBuscaCatalogo | null> {
    return this.buscar({ nome })
  }

  async buscarVersoes(idJogo: string): Promise<readonly VersaoDoJogo[]> {
    try {
      const resposta = await this.fetcher(`${this.baseUrl}/jogos/${idJogo}/versoes`)
      if (!resposta.ok) return []
      const dados = await resposta.json()
      return (dados?.versoes || []).map((v: any) => ({
        id: v.id,
        idBggVersao: v.idBggVersao,
        nomeVersao: v.nomeVersao,
        editora: v.editora,
        idioma: v.idioma,
        ano: v.ano,
        maiorMm: v.maiorMm as Milimetros,
        menorMm: v.menorMm as Milimetros,
        espessuraMm: v.espessuraMm as Milimetros,
        confirmada: v.confirmada,
        fonte: v.fonte,
      }))
    } catch {
      return []
    }
  }

  async resolverLote(
    itens: readonly {
      readonly linha?: number | undefined
      readonly nome: string
      readonly idBgg?: number | undefined
      readonly idLudopedia?: number | undefined
    }[],
  ): Promise<
    readonly {
      readonly linha?: number | undefined
      readonly itemOriginal: {
        readonly nome: string
        readonly idBgg?: number | undefined
        readonly idLudopedia?: number | undefined
      }
      readonly resultado: ResultadoBuscaCatalogo | null
    }[]
  > {
    try {
      const resposta = await this.fetcher(`${this.baseUrl}/jogos/resolver-lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens }),
      })

      if (!resposta.ok) throw new Error('Falha no lote')
      const dados = await resposta.json()
      return (dados?.resultados || []).map((r: any) => ({
        linha: r.linha,
        itemOriginal: r.itemOriginal,
        resultado: r.resultado
          ? {
              maiorMm: r.resultado.versoes?.[0]?.maiorMm as Milimetros,
              menorMm: r.resultado.versoes?.[0]?.menorMm as Milimetros,
              espessuraMm: r.resultado.versoes?.[0]?.espessuraMm as Milimetros,
              fonte: r.resultado.versoes?.[0]?.fonte || 'catalogo-central',
              idBgg: r.resultado.idBgg,
              idLudopedia: r.resultado.idLudopedia,
              versoes: r.resultado.versoes,
            }
          : null,
      }))
    } catch {
      const resultados: {
        readonly linha?: number | undefined
        readonly itemOriginal: {
          readonly nome: string
          readonly idBgg?: number | undefined
          readonly idLudopedia?: number | undefined
        }
        readonly resultado: ResultadoBuscaCatalogo | null
      }[] = []
      for (const item of itens) {
        const res = await this.fallback.buscar(item)
        resultados.push({
          linha: item.linha !== undefined ? item.linha : undefined,
          itemOriginal: item,
          resultado: res,
        })
      }
      return resultados
    }
  }

  listarFormatosPadrao(): readonly FormatoPadrao[] {
    return this.fallback.listarFormatosPadrao()
  }
}
