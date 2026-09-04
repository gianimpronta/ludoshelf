import type { Milimetros } from '../nucleo/medidas.js'

export interface FormatoPadrao {
  readonly chave: string
  readonly rotulo: string
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly fonte: string
}

export interface VersaoDoJogo {
  readonly id: string
  readonly idBggVersao?: number | null | undefined
  readonly nomeVersao: string
  readonly editora?: string | null | undefined
  readonly idioma?: string | null | undefined
  readonly ano?: number | null | undefined
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly confirmada: boolean
  readonly fonte: string
}

export interface ResultadoBuscaCatalogo {
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly chaveDoTemplate?: string | undefined
  readonly fonte: string
  readonly idBgg?: number | null | undefined
  readonly idLudopedia?: number | null | undefined
  readonly versoes?: readonly VersaoDoJogo[] | undefined
}

export interface CriteriosBuscaCatalogo {
  readonly nome?: string | undefined
  readonly idBgg?: number | undefined
  readonly idLudopedia?: number | undefined
}

export interface CatalogoDeJogos {
  buscarPorNome(nome: string): Promise<ResultadoBuscaCatalogo | null>
  buscar(criterios: CriteriosBuscaCatalogo): Promise<ResultadoBuscaCatalogo | null>
  buscarVersoes?(jogoIdOuBggId: string | number): Promise<readonly VersaoDoJogo[]>
  listarFormatosPadrao(): readonly FormatoPadrao[]
}
