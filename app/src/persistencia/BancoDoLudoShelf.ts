import Dexie, { type Table } from 'dexie'
import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo } from '../nucleo/jogo.js'

/**
 * As tabelas gravam os tipos de domínio do núcleo quase 1:1 (spec §5.1): não há
 * um modelo de persistência separado do modelo de domínio nesta escala.
 *
 * @example new BancoDoLudoShelf().jogos.put(jogo)
 */
export class BancoDoLudoShelf extends Dexie {
  jogos!: Table<CaixaDeJogo, string>
  estantes!: Table<Estante, string>

  constructor(nome = 'ludoshelf') {
    super(nome)
    this.version(1).stores({
      jogos: 'id, idJogoBase',
      estantes: 'id',
    })
  }
}
