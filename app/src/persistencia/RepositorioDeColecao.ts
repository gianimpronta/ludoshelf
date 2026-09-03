import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo, IdJogo } from '../nucleo/jogo.js'

/**
 * Fronteira de persistência. `RepositorioDexie` é a implementação de produção;
 * `RepositorioEmMemoria` serve tanto de dublê de teste quanto de fallback
 * automático quando o IndexedDB está indisponível (spec §7).
 */
export interface RepositorioDeColecao {
  carregarJogos(): Promise<readonly CaixaDeJogo[]>
  /** Upsert: cadastro manual e edição são a mesma operação. */
  salvarJogo(jogo: CaixaDeJogo): Promise<void>
  /** Upsert em lote (usado na importação de CSV). */
  salvarJogos(jogos: readonly CaixaDeJogo[]): Promise<void>
  removerJogo(id: IdJogo): Promise<void>
  /** Remove todos os jogos da coleção. */
  limparJogos(): Promise<void>
  carregarEstantes(): Promise<readonly Estante[]>
  salvarEstante(estante: Estante): Promise<void>
}
