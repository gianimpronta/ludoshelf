import { normalizarNome } from '../nucleo/medidas.js'
import type { CatalogoDeJogos, FormatoPadrao, ResultadoBuscaCatalogo } from './CatalogoDeJogos.js'

export class CatalogoFalso implements CatalogoDeJogos {
  private readonly dados = new Map<string, ResultadoBuscaCatalogo>()
  private formatos: readonly FormatoPadrao[] = []

  definirMedida(nome: string, resultado: ResultadoBuscaCatalogo): void {
    this.dados.set(normalizarNome(nome), resultado)
  }

  definirFormatos(formatos: readonly FormatoPadrao[]): void {
    this.formatos = formatos
  }

  async buscarPorNome(nome: string): Promise<ResultadoBuscaCatalogo | null> {
    return this.dados.get(normalizarNome(nome)) ?? null
  }

  listarFormatosPadrao(): readonly FormatoPadrao[] {
    return this.formatos
  }
}
