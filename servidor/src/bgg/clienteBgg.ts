import { interpretarXmlDoJogoBgg } from './parserBgg.js'
import type { JogoBgg } from './tipos.js'

export interface ConfiguracaoBgg {
  readonly baseUrl?: string
  readonly token?: string
  readonly userAgent?: string
}

export class ClienteBgg {
  private readonly baseUrl: string
  private readonly token: string | undefined
  private readonly userAgent: string

  constructor(config: ConfiguracaoBgg = {}) {
    this.baseUrl = config.baseUrl || 'https://boardgamegeek.com/xmlapi2'
    this.token = config.token ?? process.env.BGG_TOKEN ?? undefined
    this.userAgent = config.userAgent || 'LudoShelf/1.0 (dev@ludoshelf.local)'
  }

  async buscarJogoComVersoes(idBgg: number): Promise<JogoBgg | null> {
    const url = `${this.baseUrl}/thing?id=${idBgg}&versions=1`
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const resposta = await fetch(url, { headers })
      if (!resposta.ok) {
        if (resposta.status === 401) {
          console.warn('[BGG] Requisição 401 Unauthorized. BGG_TOKEN ausente ou não autorizado.')
        } else {
          console.warn(`[BGG] Resposta com status ${resposta.status} para o id ${idBgg}.`)
        }
        return null
      }

      const xml = await resposta.text()
      return interpretarXmlDoJogoBgg(xml)
    } catch (erro) {
      console.warn(`[BGG] Falha ao consultar jogo ${idBgg}:`, (erro as Error).message)
      return null
    }
  }

  async pesquisarIdPorNome(nome: string): Promise<number | null> {
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(nome)}&type=boardgame&exact=1`
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const resposta = await fetch(url, { headers })
      if (!resposta.ok) return null

      const xml = await resposta.text()
      // Busca rápida pelo primeiro item id="..."
      const match = xml.match(/<item[^>]+id="(\d+)"/)
      if (match && match[1]) {
        return parseInt(match[1], 10)
      }
      return null
    } catch {
      return null
    }
  }
}
