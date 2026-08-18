import { describe, expect, it } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { montarEstante } from '../nucleo/estante.js'
import { RepositorioEmMemoria } from './RepositorioEmMemoria.js'

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

describe('RepositorioEmMemoria', () => {
  it('comeca vazio', async () => {
    const repositorio = new RepositorioEmMemoria()
    expect(await repositorio.carregarJogos()).toEqual([])
    expect(await repositorio.carregarEstantes()).toEqual([])
  })

  it('salva e recarrega um jogo', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarJogo(jogo('a'))
    expect(await repositorio.carregarJogos()).toEqual([jogo('a')])
  })

  it('salvarJogo e upsert: mesmo id substitui', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.salvarJogo({ ...jogo('a'), nome: 'Catan renomeado' })
    const jogos = await repositorio.carregarJogos()
    expect(jogos).toHaveLength(1)
    expect(jogos[0]?.nome).toBe('Catan renomeado')
  })

  it('remove um jogo', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.removerJogo('a')
    expect(await repositorio.carregarJogos()).toEqual([])
  })

  it('remover um id inexistente nao lanca', async () => {
    const repositorio = new RepositorioEmMemoria()
    await expect(repositorio.removerJogo('fantasma')).resolves.toBeUndefined()
  })

  it('salva e recarrega uma estante', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarEstante(estante())
    expect(await repositorio.carregarEstantes()).toEqual([estante()])
  })
})
