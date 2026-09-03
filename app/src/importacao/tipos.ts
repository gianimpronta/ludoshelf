import type { CaixaDeJogo } from '../nucleo/jogo.js'

export type UnidadeDeComprimento = 'mm' | 'cm' | 'in'

export interface MapeamentoDeColunas {
  readonly colunaNome: string
  readonly colunaMaiorMm?: string
  readonly colunaMenorMm?: string
  readonly colunaEspessuraMm?: string
  readonly colunaUnidade?: string
  readonly colunaJogoBase?: string
  readonly colunaPartidas?: string
}

export type PoliticaDuplicatas = 'substituir' | 'ignorar' | 'manter-existente'

export interface OpcoesDeImportacao {
  readonly mapeamento: MapeamentoDeColunas
  readonly unidadePadrao?: UnidadeDeComprimento
  readonly politicaDuplicatas: PoliticaDuplicatas
  readonly tentarCompletarComCatalogo: boolean
  readonly nomeDoArquivo?: string
}

export interface ItemDePendencia {
  readonly linha: number
  readonly nome: string
  readonly tipo: 'jogo-base-nao-encontrado' | 'medida-ausente' | 'duplicata-ignorada'
  readonly detalhe: string
}

export interface ItemDeErroLinha {
  readonly linha: number
  readonly motivo: string
  readonly dadoBruto: string
}

export interface ResultadoProcessamentoCsv {
  readonly jogosProntosParaSalvar: readonly CaixaDeJogo[]
  readonly pendencias: readonly ItemDePendencia[]
  readonly erros: readonly ItemDeErroLinha[]
  readonly totalLinhasArquivo: number
}
