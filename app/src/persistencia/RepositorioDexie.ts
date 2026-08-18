import { BancoDoLudoShelf } from './BancoDoLudoShelf.js'
import type { RepositorioDeColecao } from './RepositorioDeColecao.js'
import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo, IdJogo } from '../nucleo/jogo.js'

/**
 * Implementação de produção sobre Dexie/IndexedDB. Só este arquivo (e
 * `BancoDoLudoShelf`) sabem que Dexie existe — o resto do app importa
 * `RepositorioDeColecao`.
 *
 * @example new RepositorioDexie().salvarJogo(jogo)
 */
export class RepositorioDexie implements RepositorioDeColecao {
  private readonly banco: BancoDoLudoShelf

  constructor(nomeDoBanco?: string) {
    this.banco = new BancoDoLudoShelf(nomeDoBanco)
  }

  async carregarJogos(): Promise<readonly CaixaDeJogo[]> {
    return this.banco.jogos.toArray()
  }

  async salvarJogo(jogo: CaixaDeJogo): Promise<void> {
    await this.banco.jogos.put(jogo)
  }

  async removerJogo(id: IdJogo): Promise<void> {
    await this.banco.jogos.delete(id)
  }

  async carregarEstantes(): Promise<readonly Estante[]> {
    return this.banco.estantes.toArray()
  }

  async salvarEstante(estante: Estante): Promise<void> {
    await this.banco.estantes.put(estante)
  }
}
