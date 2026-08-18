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
  readonly geracao: number

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
  geracao: 0,
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
    const { repositorio, jogos, geracao } = get()
    const semODuplicado = jogos.filter((j) => j.id !== jogo.id)
    set({ jogos: [...semODuplicado, jogo], arranjo: null, geracao: geracao + 1 })
    await repositorio.salvarJogo(jogo)
  },

  async removerJogo(id) {
    const { repositorio, jogos, geracao } = get()
    // Desvincula em vez de deixar orfao: uma expansao cujo jogo-base some não
    // deve manter um `idJogoBase` que não existe mais (CodeRabbit, PR #2) —
    // ela passa a existir como jogo avulso, em vez de ser removida em
    // cascata (decisão do usuário: perder o vínculo é aceitável, perder a
    // expansão cadastrada não é).
    const dependentes = jogos.filter((jogo) => jogo.idJogoBase === id)
    const semODependentes = jogos
      .filter((jogo) => jogo.id !== id)
      .map((jogo) => (jogo.idJogoBase === id ? { ...jogo, idJogoBase: null } : jogo))
    set({ jogos: semODependentes, arranjo: null, geracao: geracao + 1 })
    await Promise.all(
      dependentes.map((jogo) => repositorio.salvarJogo({ ...jogo, idJogoBase: null })),
    )
    await repositorio.removerJogo(id)
  },

  async salvarEstante(estante) {
    const { repositorio, estantes, estanteAtivaId, geracao } = get()
    const semADuplicada = estantes.filter((e) => e.id !== estante.id)
    set({
      estantes: [...semADuplicada, estante],
      estanteAtivaId: estanteAtivaId ?? estante.id,
      arranjo: null,
      geracao: geracao + 1,
    })
    await repositorio.salvarEstante(estante)
  },

  selecionarEstante(id) {
    const { geracao } = get()
    set({ estanteAtivaId: id, arranjo: null, geracao: geracao + 1 })
  },

  recalcularArranjo() {
    const { estanteAtivaId, estantes, jogos, geracao } = get()
    const estanteAtiva = estantes.find((estante) => estante.id === estanteAtivaId)
    if (estanteAtiva === undefined) return

    const geracaoCapturada = geracao + 1
    set({ calculando: true, geracao: geracaoCapturada })
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
      const { geracao: geracaoAtual } = get()
      if (geracaoAtual === geracaoCapturada) {
        set({ arranjo, calculando: false })
      }
    }, 0)
  },

  irParaTela(tela) {
    set({ telaAtiva: tela })
  },
}))
