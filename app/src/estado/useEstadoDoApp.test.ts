import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { montarEstante, type Estante } from '../nucleo/estante.js'
import { RepositorioEmMemoria } from '../persistencia/RepositorioEmMemoria.js'
import { useEstadoDoApp } from './useEstadoDoApp.js'

const jogo = (id: string): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = (id: string): Estante =>
  montarEstante(id, {
    nome: 'Billy',
    larguraUtilMm: 760,
    profundidadeUtilMm: 280,
    alturaDoRodapeMm: 80,
    espessuraDaPrateleiraMm: 18,
    alturasLivresMm: [350],
  })

beforeEach(() => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('inicializar', () => {
  it('carrega jogos e estantes do repositorio', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.salvarEstante(estante('e1'))

    await useEstadoDoApp.getState().inicializar(repositorio)

    expect(useEstadoDoApp.getState().jogos).toEqual([jogo('a')])
    expect(useEstadoDoApp.getState().estantes).toEqual([estante('e1')])
    expect(useEstadoDoApp.getState().erroDePersistencia).toBeNull()
  })

  it('cai para RepositorioEmMemoria e seta erroDePersistencia quando carregar falha', async () => {
    const repositorioQuebrado = {
      carregarJogos: () => Promise.reject(new Error('IndexedDB indisponível')),
      salvarJogo: () => Promise.resolve(),
      removerJogo: () => Promise.resolve(),
      carregarEstantes: () => Promise.resolve([]),
      salvarEstante: () => Promise.resolve(),
    }

    await useEstadoDoApp.getState().inicializar(repositorioQuebrado)

    expect(useEstadoDoApp.getState().erroDePersistencia).not.toBeNull()
    expect(useEstadoDoApp.getState().jogos).toEqual([])
  })
})

describe('salvarJogo', () => {
  it('adiciona um jogo novo ao estado e persiste', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)

    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    expect(useEstadoDoApp.getState().jogos).toEqual([jogo('a')])
    expect(await repositorio.carregarJogos()).toEqual([jogo('a')])
  })

  it('e upsert: editar um jogo existente nao duplica', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    await useEstadoDoApp.getState().salvarJogo({ ...jogo('a'), nome: 'Editado' })

    const jogos = useEstadoDoApp.getState().jogos
    expect(jogos).toHaveLength(1)
    expect(jogos[0]?.nome).toBe('Editado')
  })
})

describe('removerJogo', () => {
  it('remove do estado e do repositorio', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    await useEstadoDoApp.getState().removerJogo('a')

    expect(useEstadoDoApp.getState().jogos).toEqual([])
    expect(await repositorio.carregarJogos()).toEqual([])
  })

  it('desvincula as expansoes ao remover o jogo-base, em vez de deixar idJogoBase orfao', async () => {
    // CodeRabbit, PR #2: remover um jogo-base sem tratar os dependentes deixa
    // `idJogoBase` apontando pra um id que nao existe mais. Decisao do usuario:
    // desvincular (idJogoBase -> null), a expansao vira jogo avulso em vez de
    // ser removida em cascata ou bloquear a remocao do jogo-base.
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarJogo(jogo('base'))
    await useEstadoDoApp.getState().salvarJogo({ ...jogo('exp'), idJogoBase: 'base' })

    await useEstadoDoApp.getState().removerJogo('base')

    const jogos = useEstadoDoApp.getState().jogos
    expect(jogos).toHaveLength(1)
    expect(jogos[0]?.id).toBe('exp')
    expect(jogos[0]?.idJogoBase).toBeNull()
    expect((await repositorio.carregarJogos())[0]?.idJogoBase).toBeNull()
  })
})

describe('salvarEstante e selecionarEstante', () => {
  it('salva uma estante e a torna ativa automaticamente se for a primeira', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)

    await useEstadoDoApp.getState().salvarEstante(estante('e1'))

    expect(useEstadoDoApp.getState().estantes).toEqual([estante('e1')])
    expect(useEstadoDoApp.getState().estanteAtivaId).toBe('e1')
  })

  it('selecionarEstante troca a ativa sem mexer na lista', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarEstante(estante('e1'))
    await useEstadoDoApp.getState().salvarEstante(estante('e2'))

    useEstadoDoApp.getState().selecionarEstante('e2')

    expect(useEstadoDoApp.getState().estanteAtivaId).toBe('e2')
    expect(useEstadoDoApp.getState().estantes).toHaveLength(2)
  })
})

describe('irParaTela', () => {
  it('troca a tela ativa', () => {
    useEstadoDoApp.getState().irParaTela('colecao')
    expect(useEstadoDoApp.getState().telaAtiva).toBe('colecao')
  })
})

describe('recalcularArranjo', () => {
  it('nao faz nada sem estante ativa', () => {
    useEstadoDoApp.getState().recalcularArranjo()
    expect(useEstadoDoApp.getState().arranjo).toBeNull()
    expect(useEstadoDoApp.getState().calculando).toBe(false)
  })

  it('calcula o arranjo com os jogos e a estante ativa', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarEstante(estante('e1'))
    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    useEstadoDoApp.getState().recalcularArranjo()
    expect(useEstadoDoApp.getState().calculando).toBe(true)

    await vi.advanceTimersByTimeAsync(0)

    expect(useEstadoDoApp.getState().calculando).toBe(false)
    expect(useEstadoDoApp.getState().arranjo?.posicoes).toHaveLength(1)
  })

  it('limpa calculando quando uma mutacao invalida o calculo em andamento', async () => {
    // CodeRabbit, PR #2: a guarda de geracao evita publicar um Arranjo
    // obsoleto, mas ao pular o `set` inteiro (linhas 129-131) tambem pulava
    // o `calculando: false` — a tela ficaria presa em "Calculando..." para
    // sempre se o usuario editasse algo antes do calculo terminar.
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarEstante(estante('e1'))
    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    useEstadoDoApp.getState().recalcularArranjo()
    expect(useEstadoDoApp.getState().calculando).toBe(true)

    // Uma mutacao chega antes do calculo terminar.
    await useEstadoDoApp.getState().salvarJogo(jogo('b'))

    await vi.advanceTimersByTimeAsync(0)

    expect(useEstadoDoApp.getState().calculando).toBe(false)
  })
})
