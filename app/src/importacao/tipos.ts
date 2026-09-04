import type { CaixaDeJogo } from '../nucleo/jogo.js'

export type UnidadeDeComprimento = 'mm' | 'cm' | 'in'

export interface MapeamentoDeColunas {
  readonly colunaNome: string
  readonly colunaMaiorMm?: string | undefined
  readonly colunaMenorMm?: string | undefined
  readonly colunaEspessuraMm?: string | undefined
  readonly colunaUnidade?: string | undefined
  readonly colunaJogoBase?: string | undefined
  readonly colunaPartidas?: string | undefined
  readonly colunaIdBgg?: string | undefined
  readonly colunaIdLudopedia?: string | undefined
}

export type PoliticaDuplicatas = 'substituir' | 'ignorar' | 'manter-existente'

export interface OpcoesDeImportacao {
  readonly mapeamento: MapeamentoDeColunas
  readonly unidadePadrao?: UnidadeDeComprimento | 'auto' | undefined
  readonly politicaDuplicatas: PoliticaDuplicatas
  readonly tentarCompletarComCatalogo: boolean
  readonly nomeDoArquivo?: string | undefined
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
