import { interpretarXmlDoJogoBgg } from './parserBgg.js'
import type { JogoBgg } from './tipos.js'

export interface ConfiguracaoBgg {
  readonly baseUrl?: string
  readonly token?: string
  readonly userAgent?: string
  readonly intervaloMinimoMs?: number
  readonly maxTentativas?: number
  readonly backoffBaseMs?: number
  readonly delayFn?: (ms: number) => Promise<void>
  readonly fetcher?: typeof fetch
}

export class ClienteBgg {
  private readonly baseUrl: string
  private readonly token: string | undefined
  private readonly userAgent: string
  private readonly intervaloMinimoMs: number
  private readonly maxTentativas: number
  private readonly backoffBaseMs: number
  private readonly delayFn: (ms: number) => Promise<void>
  private readonly fetcher: typeof fetch

  private ultimoInicioRequisicao = 0
  private filaRequisicoes: Promise<any> = Promise.resolve()

  constructor(config: ConfiguracaoBgg = {}) {
    this.baseUrl = config.baseUrl || 'https://boardgamegeek.com/xmlapi2'
    this.token = config.token ?? process.env.BGG_TOKEN ?? undefined
    this.userAgent = config.userAgent || 'LudoShelf/1.0 (dev@ludoshelf.local)'
    this.intervaloMinimoMs = config.intervaloMinimoMs ?? 1000
    this.maxTentativas = config.maxTentativas ?? 3
    this.backoffBaseMs = config.backoffBaseMs ?? 2000
    this.delayFn = config.delayFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.fetcher = config.fetcher ?? ((...args) => globalThis.fetch(...args))
  }

  private executarComThrottling<T>(tarefa: () => Promise<T>): Promise<T> {
    const proxima = this.filaRequisicoes.then(async () => {
      const agora = Date.now()
      const tempoDecorrido = agora - this.ultimoInicioRequisicao
      if (tempoDecorrido < this.intervaloMinimoMs) {
        const espera = this.intervaloMinimoMs - tempoDecorrido
        await this.delayFn(espera)
      }
      this.ultimoInicioRequisicao = Date.now()
      return tarefa()
    })

    this.filaRequisicoes = proxima.catch(() => {})
    return proxima
  }

  private calcularBackoff(tentativa: number): number {
    const expoente = Math.max(0, tentativa - 1)
    const base = this.backoffBaseMs * Math.pow(2, expoente)
    const jitter = Math.floor(Math.random() * 200)
    return base + jitter
  }

  private async requisitarComRetentativa(
    url: string,
    headers: Record<string, string>,
  ): Promise<Response | null> {
    let tentativa = 0

    while (tentativa <= this.maxTentativas) {
      try {
        const resposta = await this.fetcher(url, { headers })

        if (resposta.status === 429) {
          if (tentativa >= this.maxTentativas) {
            console.warn(
              `[BGG] Limite de ${this.maxTentativas} retentativas esgotado para 429 na URL ${url}.`,
            )
            return null
          }

          tentativa++
          const retryAfterHeader = resposta.headers?.get
            ? resposta.headers.get('Retry-After')
            : (resposta.headers as any)?.['retry-after']

          let esperaMs: number
          if (retryAfterHeader) {
            const segundos = parseInt(retryAfterHeader, 10)
            esperaMs =
              !Number.isNaN(segundos) && segundos > 0
                ? segundos * 1000
                : this.calcularBackoff(tentativa)
          } else {
            esperaMs = this.calcularBackoff(tentativa)
          }

          console.warn(
            `[BGG] Resposta 429 Too Many Requests. Aguardando ${esperaMs}ms antes da tentativa ${tentativa}/${this.maxTentativas}...`,
          )
          await this.delayFn(esperaMs)
          continue
        }

        return resposta
      } catch (erro) {
        if (tentativa >= this.maxTentativas) {
          console.warn(`[BGG] Falha de rede após ${tentativa} tentativas:`, (erro as Error).message)
          return null
        }
        tentativa++
        const esperaMs = this.calcularBackoff(tentativa)
        await this.delayFn(esperaMs)
      }
    }

    return null
  }

  async buscarJogoComVersoes(idBgg: number): Promise<JogoBgg | null> {
    return this.executarComThrottling(async () => {
      const url = `${this.baseUrl}/thing?id=${idBgg}&versions=1`
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`
      }

      try {
        const resposta = await this.requisitarComRetentativa(url, headers)
        if (!resposta || !resposta.ok) {
          if (resposta && resposta.status === 401) {
            console.warn('[BGG] Requisição 401 Unauthorized. BGG_TOKEN ausente ou não autorizado.')
          } else if (resposta) {
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
    })
  }

  async pesquisarIdPorNome(nome: string): Promise<number | null> {
    return this.executarComThrottling(async () => {
      const url = `${this.baseUrl}/search?query=${encodeURIComponent(nome)}&type=boardgame&exact=1`
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`
      }

      try {
        const resposta = await this.requisitarComRetentativa(url, headers)
        if (!resposta || !resposta.ok) return null

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
    })
  }
}
