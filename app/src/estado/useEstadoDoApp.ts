import { create } from 'zustand'
import type { Arranjo } from '../nucleo/arranjo.js'
import type { Estante } from '../nucleo/estante.js'
import { geradorMulberry32 } from '../nucleo/gerador.js'
import type { CaixaDeJogo, IdJogo } from '../nucleo/jogo.js'
import { arranjar } from '../nucleo/motor.js'
import { PESOS_PADRAO } from '../nucleo/pontuacao.js'
import type { RepositorioDeColecao } from '../persistencia/RepositorioDeColecao.js'
import { RepositorioEmMemoria } from '../persistencia/RepositorioEmMemoria.js'

export type Tela = 'estantes' | 'colecao' | 'arranjo'

export interface EstadoDoApp {
  readonly jogos: readonly CaixaDeJogo[]
  readonly estantes: readonly Estante[]
  readonly estanteAtivaId: string | null
  readonly arranjo: Arranjo | null

  readonly telaAtiva: Tela
  readonly calculando: boolean
  readonly erroDePersistencia: string | null

  readonly repositorio: RepositorioDeColecao

  inicializar(repositorio: RepositorioDeColecao): Promise<void>
  salvarJogo(jogo: CaixaDeJogo): Promise<void>
  removerJogo(id: IdJogo): Promise<void>
  salvarEstante(estante: Estante): Promise<void>
  selecionarEstante(id: string): void
  recalcularArranjo(): void
  irParaTela(tela: Tela): void
}

const estadoInicial = {
  jogos: [] as readonly CaixaDeJogo[],
  estantes: [] as readonly Estante[],
  estanteAtivaId: null as string | null,
  arranjo: null as Arranjo | null,
  telaAtiva: 'estantes' as Tela,
  calculando: false,
  erroDePersistencia: null as string | null,
  repositorio: new RepositorioEmMemoria() as RepositorioDeColecao,
}

export const useEstadoDoApp = create<EstadoDoApp>((set, get) => ({
  ...estadoInicial,

  async inicializar(repositorio) {
    try {
      const [jogos, estantes] = await Promise.all([
        repositorio.carregarJogos(),
        repositorio.carregarEstantes(),
      ])
      set({ repositorio, jogos, estantes, erroDePersistencia: null })
    } catch {
      // Fallback automático (spec §7): o app segue funcional, sem persistir.
      set({
        repositorio: new RepositorioEmMemoria(),
        jogos: [],
        estantes: [],
        erroDePersistencia:
          'Não foi possível abrir o armazenamento local; nada será salvo nesta sessão.',
      })
    }
  },

  async salvarJogo(jogo) {
    const { repositorio, jogos } = get()
    const semODuplicado = jogos.filter((j) => j.id !== jogo.id)
    set({ jogos: [...semODuplicado, jogo] })
    await repositorio.salvarJogo(jogo)
  },

  async removerJogo(id) {
    const { repositorio, jogos } = get()
    set({ jogos: jogos.filter((jogo) => jogo.id !== id) })
    await repositorio.removerJogo(id)
  },

  async salvarEstante(estante) {
    const { repositorio, estantes, estanteAtivaId } = get()
    const semADuplicada = estantes.filter((e) => e.id !== estante.id)
    set({
      estantes: [...semADuplicada, estante],
      estanteAtivaId: estanteAtivaId ?? estante.id,
    })
    await repositorio.salvarEstante(estante)
  },

  selecionarEstante(id) {
    set({ estanteAtivaId: id })
  },

  recalcularArranjo() {
    const { estanteAtivaId, estantes, jogos } = get()
    const estanteAtiva = estantes.find((estante) => estante.id === estanteAtivaId)
    if (estanteAtiva === undefined) return

    set({ calculando: true })
    // Adia um tick: sem isso a mesma thread que pintaria o esmaecimento fica
    // ocupada pelas iterações do motor, e o usuário nunca vê o estado
    // "calculando" (spec §6).
    setTimeout(() => {
      const arranjo = arranjar({
        jogos,
        estante: estanteAtiva,
        pesos: PESOS_PADRAO,
        gerador: geradorMulberry32(Date.now()),
        iteracoes: 20000,
      })
      set({ arranjo, calculando: false })
    }, 0)
  },

  irParaTela(tela) {
    set({ telaAtiva: tela })
  },
}))
