import { sanitizarNome } from '../importacao/sanitizarNome.js'
import { normalizarNome } from '../nucleo/medidas.js'
import type { CatalogoDeJogos, FormatoPadrao, ResultadoBuscaCatalogo } from './CatalogoDeJogos.js'
import dadosSemeadura from './dados/tabela-semeada.json'

interface EntradaJogoConhecido {
  readonly chave: string
  readonly nomesConhecidos: readonly string[]
  readonly maiorMm: number
  readonly menorMm: number
  readonly espessuraMm: number
  readonly fonte: string
}

export class CatalogoSemeado implements CatalogoDeJogos {
  private readonly mapaNomes = new Map<string, ResultadoBuscaCatalogo>()

  constructor() {
    for (const item of dadosSemeadura.jogosConhecidos as readonly EntradaJogoConhecido[]) {
      const resultado: ResultadoBuscaCatalogo = {
        maiorMm: item.maiorMm,
        menorMm: item.menorMm,
        espessuraMm: item.espessuraMm,
        chaveDoTemplate: item.chave,
        fonte: item.fonte,
      }
      for (const nome of item.nomesConhecidos) {
        this.mapaNomes.set(normalizarNome(nome), resultado)
      }
    }
  }

  async buscarPorNome(nomeBruto: string): Promise<ResultadoBuscaCatalogo | null> {
    try {
      const limpo = sanitizarNome(nomeBruto)
      const normalizado = normalizarNome(limpo)
      return this.mapaNomes.get(normalizado) ?? null
    } catch {
      return null
    }
  }

  async buscar(criterios: {
    readonly nome?: string | undefined
  }): Promise<ResultadoBuscaCatalogo | null> {
    if (criterios.nome) {
      return this.buscarPorNome(criterios.nome)
    }
    return null
  }

  listarFormatosPadrao(): readonly FormatoPadrao[] {
    return dadosSemeadura.formatosPadrao as readonly FormatoPadrao[]
  }

  protected carregarDados() {
    return dadosSemeadura
  }
}
