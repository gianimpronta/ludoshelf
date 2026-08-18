import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { montarEstante } from '../nucleo/estante.js'
import { RepositorioDexie } from './RepositorioDexie.js'

const jogo = (id: string): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = () =>
  montarEstante('e1', {
    nome: 'Billy',
    larguraUtilMm: 760,
    profundidadeUtilMm: 280,
    alturaDoRodapeMm: 80,
    espessuraDaPrateleiraMm: 18,
    alturasLivresMm: [350],
  })

describe('RepositorioDexie', () => {
  // Cada teste abre um banco com nome único: fake-indexeddb persiste entre
  // testes do mesmo processo, e um nome compartilhado vazaria estado de um
  // teste para o outro.
  let contador = 0
  const novoRepositorio = () => new RepositorioDexie(`teste-${(contador += 1)}`)

  it('comeca vazio', async () => {
    const repositorio = novoRepositorio()
    expect(await repositorio.carregarJogos()).toEqual([])
  })

  it('salva e recarrega um jogo', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarJogo(jogo('a'))
    expect(await repositorio.carregarJogos()).toEqual([jogo('a')])
  })

  it('salvarJogo e upsert', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.salvarJogo({ ...jogo('a'), nome: 'Renomeado' })
    const jogos = await repositorio.carregarJogos()
    expect(jogos).toHaveLength(1)
    expect(jogos[0]?.nome).toBe('Renomeado')
  })

  it('remove um jogo', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.removerJogo('a')
    expect(await repositorio.carregarJogos()).toEqual([])
  })

  it('salva e recarrega uma estante', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarEstante(estante())
    expect(await repositorio.carregarEstantes()).toEqual([estante()])
  })

  it('persiste jogos e estantes em tabelas independentes', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.salvarEstante(estante())
    expect(await repositorio.carregarJogos()).toHaveLength(1)
    expect(await repositorio.carregarEstantes()).toHaveLength(1)
  })
})
