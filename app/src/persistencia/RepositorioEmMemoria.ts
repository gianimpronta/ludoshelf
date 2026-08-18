import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo, IdJogo } from '../nucleo/jogo.js'
import type { RepositorioDeColecao } from './RepositorioDeColecao.js'

/**
 * Dublê nomeado: usado nos testes de `estado/`, e como fallback real do app
 * quando o IndexedDB não abre (aba anônima).
 *
 * @example new RepositorioEmMemoria().salvarJogo(jogo)
 */
export class RepositorioEmMemoria implements RepositorioDeColecao {
  private readonly jogos = new Map<IdJogo, CaixaDeJogo>()
  private readonly estantes = new Map<string, Estante>()

  async carregarJogos(): Promise<readonly CaixaDeJogo[]> {
    return [...this.jogos.values()]
  }

  async salvarJogo(jogo: CaixaDeJogo): Promise<void> {
    this.jogos.set(jogo.id, jogo)
  }

  async removerJogo(id: IdJogo): Promise<void> {
    this.jogos.delete(id)
  }

  async carregarEstantes(): Promise<readonly Estante[]> {
    return [...this.estantes.values()]
  }

  async salvarEstante(estante: Estante): Promise<void> {
    this.estantes.set(estante.id, estante)
  }
}
