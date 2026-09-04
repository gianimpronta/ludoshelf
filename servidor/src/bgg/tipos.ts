export interface VersaoBgg {
  readonly idVersao: number
  readonly nomeVersao: string
  readonly editora?: string | undefined
  readonly idioma?: string | undefined
  readonly ano?: number | undefined
  readonly maiorMm: number
  readonly menorMm: number
  readonly espessuraMm: number
}

export interface JogoBgg {
  readonly idBgg: number
  readonly nome: string
  readonly anoLancamento?: number | undefined
  readonly versoes: readonly VersaoBgg[]
}
