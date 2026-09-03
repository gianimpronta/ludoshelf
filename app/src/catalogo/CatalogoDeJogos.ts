import type { Milimetros } from '../nucleo/medidas.js'

export interface FormatoPadrao {
  readonly chave: string
  readonly rotulo: string
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly fonte: string
}

export interface ResultadoBuscaCatalogo {
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly chaveDoTemplate: string
  readonly fonte: string
}

export interface CatalogoDeJogos {
  buscarPorNome(nome: string): Promise<ResultadoBuscaCatalogo | null>
  listarFormatosPadrao(): readonly FormatoPadrao[]
}
